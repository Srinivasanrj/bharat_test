const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
require('dotenv').config();

const client = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function checkData() {
    try {
        const result = await docClient.send(new ScanCommand({
            TableName: "SchemesTable",
            Limit: 5
        }));
        console.log(`Total items scanned: ${result.Count}`);
        console.log(`Scanned count (approximate): ${result.ScannedCount}`);
        console.log("\nFirst few items:");
        result.Items.forEach((item, i) => {
            console.log(`\n--- Item ${i + 1} ---`);
            console.log(`  id: ${item.id}`);
            console.log(`  name: ${item.name || 'N/A'}`);
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
}

checkData();
