const fs = require('fs');

const file1 = '/home/hardana/Projects/vibework/src/app/engine/page.tsx';
let content1 = fs.readFileSync(file1, 'utf8');
content1 = content1.replace(
  `  const handleInterviewComplete = () => {\n    alert("Wawancara Selesai! Mengarahkan ke pembuatan Workflow...");\n  };\n\n  return (\n    <div className="w-full h-full flex flex-col bg-brutal-white overflow-hidden">\n      <div className="flex-1 w-full flex overflow-hidden">\n        <div className="flex-1 flex justify-center items-center bg-brutal-white">\n          <InterviewChat onInterviewComplete={handleInterviewComplete} />\n        </div>\n      </div>\n    </div>\n  );`,
  `  return (\n    <div className="w-full h-full flex flex-col bg-brutal-white overflow-hidden">\n      <div className="flex-1 w-full flex overflow-hidden">\n        <div className="flex-1 flex justify-center items-center bg-brutal-white">\n          <InterviewChat />\n        </div>\n      </div>\n    </div>\n  );`
);
fs.writeFileSync(file1, content1);

const file2 = '/home/hardana/Projects/vibework/src/app/engine/[id]/page.tsx';
let content2 = fs.readFileSync(file2, 'utf8');
// [id]/page.tsx never passed onInterviewComplete actually, it only passed initialSessionId and initialMessages.
// Let's just make sure.
console.log("Fixed engine pages");
