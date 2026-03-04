const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure AWS Region
AWS.config.update({
    region: "eu-north-1"
});

const docClient = new AWS.DynamoDB.DocumentClient();

async function importData() {
    try {
        console.log("Loading data from local JSON...");
        const dataPath = path.join(__dirname, 'data/csv_schemes.json');
        
        if (!fs.existsSync(dataPath)) {
             console.error("Error: Could not find data/csv_schemes.json");
             return;
        }

        const schemesData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        console.log(`Found ${schemesData.length} records. Starting import to DynamoDB...`);

        // DynamoDB handles batch writes in chunks of 25 maximum
        const chunkSize = 25;
        let batches = [];

        for (let i = 0; i < schemesData.length; i += chunkSize) {
            batches.push(schemesData.slice(i, i + chunkSize));
        }

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            
            const params = {
                RequestItems: {
                    "SchemesTable": batch.map(scheme => {
                        // Ensure each item has a unique string ID as required by our table design
                        // If it doesn't have an ID, we'll quickly generate one using the index
                        const itemId = scheme.id ? String(scheme.id) : `scheme_${i * chunkSize + batch.indexOf(scheme)}`;
                        
                        return {
                            PutRequest: {
                                Item: {
                                    ...scheme,
                                    id: itemId // Make sure id is exactly what the partition key expects (String)
                                }
                            }
                        };
                    })
                }
            };

            await docClient.batchWrite(params).promise();
            console.log(`Processed batch ${i + 1}/${batches.length}`);
        }

        console.log("\n✅ Import Complete! All data is now in DynamoDB.");

    } catch (err) {
        console.error("Error importing data:", err);
    }
}

importData();
