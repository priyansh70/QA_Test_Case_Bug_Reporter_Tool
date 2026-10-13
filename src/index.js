const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { getWorkItem } = require("./azure/azureClient");
const { generateTestCases } = require("./ai/testCaseGenerator");

/**
 * Main execution function for QA Testcase Generator.
 */
async function main() {
  console.log("====================================================");
  console.log("         🚀 QA Test Case Generator (AI)            ");
  console.log("====================================================\n");

  const args = process.argv.slice(2);
  let workItemId = args[0];

  if (!workItemId || workItemId.startsWith("-")) {
    console.log("💡 Usage:");
    console.log("   npm start <WORK_ITEM_ID>");
    console.log("   node src/index.js <WORK_ITEM_ID>\n");
    console.log("⚠️  No Work Item ID specified.");
    console.log("   Example: node src/index.js 42516\n");
    process.exit(1);
  }

  try {
    console.log(`📡 Fetching Azure DevOps Work Item #${workItemId}...`);
    const workItem = await getWorkItem(workItemId);

    console.log(
      `✅ Retrieved Work Item: "${workItem.title}" (${workItem.type})`,
    );
    const provider = process.env.AI_PROVIDER || "auto-detected";
    const model =
      process.env.AI_MODEL ||
      process.env.OPENAI_MODEL ||
      process.env.GEMINI_MODEL ||
      "default";
    console.log(
      `🤖 Generating test cases using AI provider: ${provider} (model: ${model})...`,
    );

    const jsonResult = await generateTestCases(workItem);

    // Save output to JSON file
    const outputDir = path.resolve(
      process.cwd(),
      process.env.OUTPUT_DIR || "output",
    );
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFilePath = path.join(outputDir, `test-cases-${workItemId}.json`);
    fs.writeFileSync(outputFilePath, jsonResult, "utf8");

    console.log("\n====================================================");
    console.log("🎉 Test cases successfully generated!");
    console.log(`📄 Saved to: ${outputFilePath}`);
    console.log("====================================================\n");

    console.log("--- TEST CASES PREVIEW (JSON) ---\n");
    console.log(jsonResult.slice(0, 1500));
    if (jsonResult.length > 1500) {
      console.log(
        "\n... [Content truncated in console preview. View full file in output directory.]",
      );
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exitCode = 1;
  }
}

main();
