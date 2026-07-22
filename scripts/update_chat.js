const fs = require('fs');
const file = '/home/hardana/Projects/vibework/src/components/ui/InterviewChat.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove onInterviewComplete prop
content = content.replace(
  `export function InterviewChat({ \n  initialSessionId, \n  initialMessages = [], \n  onInterviewComplete \n}: { \n  initialSessionId?: string, \n  initialMessages?: Message[],\n  onInterviewComplete?: () => void \n}) {`,
  `export function InterviewChat({ \n  initialSessionId, \n  initialMessages = []\n}: { \n  initialSessionId?: string, \n  initialMessages?: Message[]\n}) {`
);

// 2. Add handleGenerateWorkflow
const generateFunction = `  const handleGenerateWorkflow = async () => {
    if (!sessionId) return;
    setStatus('generating');
    setError(null);
    try {
      const res = await fetch('/api/projects/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/projects/' + data.projectId);
      } else {
        setError(data.error || 'Failed to generate workflow');
        setStatus('idle');
      }
    } catch (e: any) {
      setError(e.message);
      setStatus('idle');
    }
  };`;

content = content.replace(
  `  const [isComplete, setIsComplete] = useState(false);`,
  `  const [isComplete, setIsComplete] = useState(false);\n\n${generateFunction}`
);

// 3. Update the button
const oldButton = `{isComplete && onInterviewComplete && activePhaseTab === 5 && (
                <Button variant="primary" size="sm" onClick={onInterviewComplete} className="animate-pulse">
                  Generate Workflow
                </Button>
              )}`;
const newButton = `{isComplete && activePhaseTab === 5 && (
                <Button variant="primary" size="sm" onClick={handleGenerateWorkflow} disabled={status === 'generating'} className="animate-pulse">
                  {status === 'generating' ? 'Generating PRD...' : 'Generate Workflow'}
                </Button>
              )}`;
content = content.replace(oldButton, newButton);

fs.writeFileSync(file, content);
console.log("Updated InterviewChat.tsx");
