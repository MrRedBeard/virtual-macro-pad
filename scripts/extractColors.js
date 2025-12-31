const path = require("path");
const fs = require("fs");
const resolveConfig = require("tailwindcss/resolveConfig");

// Load your Tailwind config
const configPath = path.resolve(__dirname, "../tailwind.config.js");
const tailwindConfig = require(configPath);

// Resolve the full theme (includes defaults from node_modules + your overrides)
const fullConfig = resolveConfig(tailwindConfig);

// Grab every color scale
const allColors = fullConfig.theme.colors;

// Recursively flatten nested color objects (e.g. gray.500 → gray-500)
function flattenColors(obj, prefix = "")
{
  const result = {};

  for (const [key, value] of Object.entries(obj))
  {
    const label = prefix ? `${prefix}-${key}` : key;

    if (typeof value === "string")
    {
      result[label] = value;
    }
    else if (typeof value === "object" && value !== null)
    {
      Object.assign(result, flattenColors(value, label));
    }
  }

  return result;
}

const flatColors = flattenColors(allColors);

// Generate JS module
const jsOutput = `// Auto-generated from Tailwind config
const themeColors = ${JSON.stringify(flatColors, null, 2)};
`;

// Write JS file
const outputPath = path.resolve(__dirname, "../www/content/theme/theme-colors.js");
fs.writeFileSync(outputPath, jsOutput);
console.log("✅ theme-colors.js generated at:", outputPath);

let html = '';
Object.keys(flatColors).forEach((color) =>
{
  html += `<div class="bg-${color}"></div>`;
});
const htmlOutputPath = path.resolve(__dirname, "../tailwindInput/colors.html");
fs.writeFileSync(htmlOutputPath, html);


console.log("✅ colors.html generated at:", htmlOutputPath);
