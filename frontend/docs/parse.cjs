const fs = require('fs');

function extractBody(file) {
  const html = fs.readFileSync(file, 'utf8');
  const bodyStart = html.indexOf('<body');
  if (bodyStart === -1) return '';
  const firstAngle = html.indexOf('>', bodyStart) + 1;
  const bodyEnd = html.lastIndexOf('</body>');
  return html.substring(firstAngle, bodyEnd).trim();
}

function createComponent(name, file) {
  const content = extractBody(file);
  // Replace backticks and dollar signs
  const safeContent = content.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  const code = `export const ${name} = () => {
  return \`
${safeContent}
  \`;
};
`;
  fs.writeFileSync(`../src/pages/${name}.js`, code);
}

createComponent('RoomDetails', '02214e1d24924b92b9afc12911f448eb.html');
createComponent('Checkout', 'c17aced56e414273bf2558172fcde9f7.html');
createComponent('Dashboard', '9c913e5dfaad4ff5aedd4064031290de.html');
console.log('Components created!');
