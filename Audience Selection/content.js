const button = document.getElementById("fetchRecords");
const askQuestion = document.getElementById("askQuestion");
const downloadTextReport = document.getElementById("downloadReport");
const container = document.querySelector(".container"); // Get a reference to the div
const fetchContainer = document.querySelector(".fetchContainer"); // Get a reference to the div
const questionsContainer = document.querySelector(".questionsContainer");


let mainArray = [];
let apiKey = '';
const editableFields = container.querySelectorAll("input"); // Select all text input fields

editableFields.forEach(field => {
  field.addEventListener("keyup", checkFormCompletion); // Add listener to each field
});

function extractID(input) {
  // Regular expression to match the ID pattern (same as before)
  const regex = /\/d\/([^\/]+)\//;

  // Check if input is a URL
  if (typeof input === "string" && input.includes("https://docs.google.com/spreadsheets/d/")) {
    // Use regular expression to extract ID from URL
    const match = input.match(regex);
    return match ? match[1] : null;
  } else {
    // If not a URL, directly return the input (assuming it's the ID)
    return input;
  }
}

function checkFormCompletion() {
    const button = document.getElementById("fetchRecords"); // Reference the button element

    // Check if all fields have values (replace with your actual logic if needed)
    let allFilled = true;
    editableFields.forEach(field => {
      if (field.value.trim() === "") {
        allFilled = false;
        return; // Exit the loop if an empty field is found
      }
    });
  
    console.log(allFilled);
    button.disabled = !allFilled; // Disable button if not all fields are filled
  }

askQuestion.addEventListener("click", function() {
    const userQuestion = document.getElementById("userQuestion").value;
    sendPrompt(userQuestion, mainArray);
});

downloadTextReport.addEventListener("click", function() {
    const genResponsePara = document.getElementById("genResponse").textContent;
    save("report.txt", genResponsePara);
});

button.addEventListener("click", function() {
    // Function to fetch and display data (replace with your existing code)
    const sheetIdUrl = document.getElementById("sheetId").value.trim(); // Get spreadsheet ID
    const sheetId = extractID(sheetIdUrl);
    const startRow = document.getElementById("startRow").value;
    const startColumn = document.getElementById("startColumn").value;
    const endRow = document.getElementById("endRow").value;
    const endColumn = document.getElementById("endColumn").value;

    chrome.identity.getAuthToken({ 'interactive': true }, getToken);

    function getToken(token) {
        console.log('this is the token: ', token);
        
      let init = {
       method: 'GET',
       async: true,
       headers: {
         Authorization: 'Bearer ' + token,
         'Content-Type': 'application/json'
       },
       'contentType': 'json'
      };
      
      
      const tableContainer = document.getElementById("myTable");
      
      
      function createTable(data) {
          const table = document.createElement("table");
          tableContainer.innerHTML = ""; // Removes existing content
         
          const tableHeaders = Object.keys(data[0]);
      
          // Create the table header row
          const headerRow = document.createElement("tr");
          tableHeaders.forEach((header) => {
              const headerCell = document.createElement("th");
              headerCell.textContent = header;
              headerRow.appendChild(headerCell);
          });
          table.appendChild(headerRow);
      
          // Create table body rows with data
        data.forEach((object) => {
          const dataRow = document.createElement("tr");
          tableHeaders.forEach((header) => {
            const dataCell = document.createElement("td");
            dataCell.textContent = object[header];
            dataRow.appendChild(dataCell);
          });
          table.appendChild(dataRow);
        });
      

        tableContainer.appendChild(table);
        questionsContainer.style.display = "flex";
      }
      
      // Function to fetch data and create table (replace with your actual implementation)
      function fetchAndDisplayData(sheetId, startRow, startColumn, endRow, endColumn) {
          fetch(
              "https://sheets.googleapis.com/v4/spreadsheets/".concat(sheetId.trim()).concat("/values/R".concat(startRow).concat("C").concat(startColumn)).concat(":").concat("R").concat(endRow).concat("C").concat(endColumn),
              init)
              .then((response) => response.json())
              .then(function(data) {
               let originalArray = data.values
                //console.log(data.values)
           
                const keyValuePairs = originalArray.slice(1).map((valueArray, index) => {
                   const myObject = {};
                   valueArray.forEach(function (element, index) { 
                       
                       const header = originalArray[0][index]
                       myObject[header] = element
                       
                       
                   });
                   mainArray.push(myObject)
                   const header = originalArray[0][index];
                   const values = valueArray;
                   return { [header]: values };
                 });
           
                 createTable(mainArray);
              });
           }

           fetchAndDisplayData(sheetId, startRow, startColumn, endRow, endColumn);
           
      }
  });

  function makeBold(text) {
    // Regular expression to match bold formatting (two asterisks)
    const regex = /\*\*(.*?)\*\*/g;
  
    // Replace occurrences of "**" with bold tags
    return text.replace(regex, "<b>$1</b>\n");
  }

async function sendPrompt(question, array) {
    const downloadReport = document.querySelector(".report");
    askQuestion.disabled = true;
    askQuestion.innerHTML = "Please Wait";
    downloadReport.style.display = "none";


    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key='; // Replace with your actual API Key
    let prompt = "Act like a professional expert in analysis and I am going to provide you an array of objects in which the key can be treated as a question and the value for the appropriate key can be considered as a response to the question. Based on the criteria defined as "+question+" you need to analyze why a person is suitable to attend the event and provide me the email id along with reason for selection as an array of object in a json. "+JSON.stringify(array);
    var payload = {
      "contents":[{"parts":[{"text": prompt}]}],
      "generationConfig": {
        "temperature": 0.8,
        "topK": 1,
        "topP": 1,
        "maxOutputTokens": 12048,
        "stopSequences": []
      },
      "safetySettings": [
      {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
    };

    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      };

      const genResponsePara = document.getElementById("genResponse");

      try {
        const response = await fetch(url, options);
        if (response.ok) { // Handle successful response
          const responseJson = await response.json();
          // Extract the generated text from the response structure (replace with actual property names)
          const generatedText = responseJson.candidates[0].content.parts[0].text;
          const boldText = makeBold(generatedText);
          
          genResponsePara.innerHTML = boldText;
          askQuestion.innerHTML = "Ask Question";
          askQuestion.disabled = false;
          downloadReport.style.display = "block";
        } else {
            askQuestion.innerHTML = "Ask Question";
            askQuestion.disabled = false;
            genResponsePara.innerHTML = "Unable to process your request";
        }
      } catch (error) {
            askQuestion.innerHTML = "Ask Question";
            askQuestion.disabled = false;
            genResponsePara.innerHTML = "Unable to process your request"+error;
      }
  
  }

  function save(filename, data) {
    const blob = new Blob([data], {type: 'text/csv'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;        
        document.body.appendChild(elem);
        elem.click();        
        document.body.removeChild(elem);
    }
}