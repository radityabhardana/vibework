const fs = require('fs');
const file = '/home/hardana/Projects/vibework/src/components/ui/ProjectWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldNodes = `  const initialNodes: Node[] = [
    { id: '1', position: { x: 50, y: 50 }, data: { label: \`PRD: \${project.name}\` }, type: 'default' },
    { id: '2', position: { x: 50, y: 200 }, data: { label: 'ADR: Pending Generation' }, type: 'default' },
    { id: '3', position: { x: 50, y: 350 }, data: { label: 'Schema: Pending Generation' }, type: 'default' },
    { id: '4', position: { x: 50, y: 500 }, data: { label: 'Prompt: Pending...' }, type: 'default' },
  ];`;

const newNodes = `  const initialNodes: Node[] = [
    { id: '1', position: { x: 50, y: 50 }, data: { label: prd ? \`✅ PRD: \${project.name}\` : \`PRD: Pending\` }, type: 'default' },
    { id: '2', position: { x: 50, y: 200 }, data: { label: 'ADR: Pending Generation' }, type: 'default' },
    { id: '3', position: { x: 50, y: 350 }, data: { label: 'Schema: Pending Generation' }, type: 'default' },
    { id: '4', position: { x: 50, y: 500 }, data: { label: 'Prompt: Pending...' }, type: 'default' },
  ];`;

content = content.replace(oldNodes, newNodes);
fs.writeFileSync(file, content);
console.log("Updated ProjectWorkspace.tsx");
