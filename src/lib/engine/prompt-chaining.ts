import { getApiKeys } from '@/lib/utils';

function extractFirstJsonObject(str: string): string {
  const startIdx = str.indexOf('{');
  if (startIdx === -1) return str;

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = startIdx; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      if (char === '\\' && !isEscaped) {
        isEscaped = true;
      } else {
        if (char === '"' && !isEscaped) {
          inString = false;
        }
        isEscaped = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return str.slice(startIdx, i + 1);
        }
      }
    }
  }

  return str.slice(startIdx);
}

async function callQwen(systemPrompt: string, userPrompt: string) {
  const apiKeys = getApiKeys();

  if (apiKeys.length === 0) {
    throw new Error("No API keys configured.");
  }

  const payload = {
    model: process.env.AI_MODEL_NAME || 'alims-intl/deepseek-v4-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };

  let lastError: any;

  for (const apiKey of apiKeys) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s max timeout for fast response

      const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      let textContent = data.choices[0].message.content || '';
      if (!textContent && data.choices[0].message.reasoning_content) {
        textContent = data.choices[0].message.reasoning_content;
      }
      
      // Extract exact JSON object
      const cleanText = extractFirstJsonObject(textContent.trim());

      try {
        return JSON.parse(cleanText);
      } catch (parseErr) {
        const repaired = cleanText
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/[\u0000-\u001F]+/g, ' ');
        return JSON.parse(repaired);
      }
    } catch (err: any) {
      console.warn("API Key failed, falling back...", err.message || err);
      lastError = err;
    }
  }

  throw new Error(`All API keys failed. Last error: ${lastError?.message}`);
}


export async function generatePRD(chatHistory: string) {
  const systemPrompt = `You are an expert Product Manager and System Architect. 
Your task is to analyze the provided interview transcript and generate a structured Product Requirements Document (PRD).
You MUST return ONLY a valid JSON object. Do not include markdown \`\`\`json codeblocks, just the raw JSON object starting with { and ending with }.
The JSON object must follow this exact schema:
{
  "name": "A short, catchy name for the project (max 3 words)",
  "description": "A 1-sentence punchy description",
  "targetUser": "Who this is for",
  "coreFeatures": "Bullet points of MVP features",
  "mvpConstraints": "Technical or scope constraints",
  "monetizationModel": "How it makes money (or if it's free)",
  "documentContent": "A detailed Markdown PRD document covering all the above and any architecture notes. Make it comprehensive."
}`;

  return callQwen(systemPrompt, chatHistory);
}

export async function generateADR(prdContent: string) {
  const systemPrompt = `You are an expert System Architect. 
Based on the provided Product Requirements Document (PRD), choose the best technology stack and generate an Architecture Decision Record (ADR).
You MUST return ONLY a valid JSON object. Do not include markdown \`\`\`json codeblocks.
Schema:
{
  "frontendStack": "e.g., Next.js, React, React Native",
  "backendStack": "e.g., Node.js, Next.js API, Python",
  "database": "e.g., PostgreSQL, SQLite, MongoDB",
  "deployment": "e.g., Vercel, AWS, Fly.io",
  "adrDocument": "A detailed Markdown document explaining the architecture choices, diagrams if possible, and rationale based on the PRD."
}`;
  return callQwen(systemPrompt, prdContent);
}

export async function generateSchema(prdContent: string, adrContent: string) {
  const systemPrompt = `You are an expert Database Designer and API Architect.
Based on the provided PRD and ADR, generate the Database Schema and API Contracts.
You MUST return ONLY a valid JSON object. Do not include markdown \`\`\`json codeblocks.
Schema:
{
  "dbSchema": "A detailed Markdown document containing the database schema (tables, relationships, types).",
  "apiContract": { "endpoints": [ { "method": "GET", "path": "/api/...", "description": "...", "req": {}, "res": {} } ] }
}`;
  return callQwen(systemPrompt, `PRD:\n${prdContent}\n\nADR:\n${adrContent}`);
}

export async function generateAtomicPrompts(prdContent: string, adrContent: string, schemaContent: string) {
  const systemPrompt = `You are an expert AI Coding Manager. 
Based on the PRD, ADR, and Database Schema, break down the project implementation into a sequence of "Atomic Prompts". Each prompt will be given to a Junior AI Coder to implement.
You MUST return ONLY a valid JSON object. Do not include markdown \`\`\`json codeblocks.
The JSON must have this exact schema:
{
  "prompts": [
    {
      "title": "Short title, e.g., Setup Project",
      "context": "Context for the AI coder",
      "task": "Specific task instruction",
      "constraints": "Important constraints (e.g., use Tailwind, no classes)",
      "format": "Expected output format",
      "dependencies": ["List of previous prompt titles this depends on"],
      "executionOrder": 1
    }
  ]
}`;
  return callQwen(systemPrompt, `PRD:\n${prdContent}\n\nADR:\n${adrContent}\n\nSCHEMA:\n${schemaContent}`);
}

export async function generateAppFlowchart(prdContent: string) {
  const systemPrompt = `You are an expert UX Designer and System Analyst.
Based on the provided Product Requirements Document (PRD), generate a logical flowchart of the Application's User Journey and Business Logic (e.g. Splash Screen -> Login -> Dashboard -> Add Transaction).
You MUST return ONLY a valid JSON object. Do not include markdown \`\`\`json codeblocks.
CRITICAL RULES:
1. The graph MUST be fully connected. No disconnected nodes (e.g. Login MUST connect to Dashboard on success).
2. Ensure cyclical paths (like going back to a previous screen) are logically correct and explicitly stated in edges.
3. Keep the node IDs simple and lowercase (e.g., 'login', 'home', 'settings').

The JSON must have this exact schema:
{
  "nodes": [
    { "id": "login", "label": "Login Screen", "description": "User enters credentials" }
  ],
  "edges": [
    { "source": "login", "target": "dashboard", "label": "On Success" }
  ]
}`;
  return callQwen(systemPrompt, `PRD:\n${prdContent}`);
}

function createFallbackRoadmap(topic: string) {
  const cleanTopic = topic.trim();
  const lower = cleanTopic.toLowerCase();
  const capTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
  const slug = cleanTopic.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  if (lower.includes('machine learning') || lower.includes('ml') || lower.includes('data science')) {
    return {
      title: "Machine Learning & AI Engineering Roadmap",
      description: "Complete, step-by-step roadmap from absolute basics (Math & Python) to Supervised Learning, Deep Learning, Transformers, and MLOps Production.",
      sections: [
        {
          sectionName: "1. Introduction & Mathematical Foundations",
          order: 1,
          groups: [
            {
              groupName: "Basics & Prerequisites",
              side: "left",
              topics: [
                {
                  nodeId: "ml_what_is",
                  title: "What is Machine Learning?",
                  description: "Overview of ML paradigms: Supervised, Unsupervised, & Reinforcement Learning.",
                  category: "required",
                  prerequisites: [],
                  contentMarkdown: "# What is Machine Learning?\n\nMachine learning is a subset of artificial intelligence focused on building systems that learn from data to improve performance without explicit programming.\n\n### Core Paradigms:\n- **Supervised Learning**: Learning with labeled data (Regression & Classification).\n- **Unsupervised Learning**: Finding hidden patterns in unlabeled data (Clustering & Dimensionality Reduction).\n- **Reinforcement Learning**: Agent learning through trial, reward, and punishment.",
                  quiz: [
                    {
                      id: "q1",
                      question: "Which ML paradigm uses labeled input-output data pairs?",
                      options: ["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Self-Organizing Maps"],
                      correctAnswerIndex: 0,
                      explanation: "Supervised learning relies on labeled training data pairs."
                    }
                  ]
                },
                {
                  nodeId: "ml_math_linear_algebra",
                  title: "Linear Algebra for ML",
                  description: "Vectors, matrices, dot products, eigenvalues, and eigenvectors.",
                  category: "required",
                  prerequisites: ["ml_what_is"],
                  contentMarkdown: "# Linear Algebra in Machine Learning\n\nLinear algebra provides the mathematical language for vector spaces and matrix operations used in neural networks and ML models.\n\n### Key Concepts:\n- **Vectors & Matrices**: High-dimensional data representation.\n- **Dot Products & Matrix Multiplication**: Weight transforms and projections.\n- **Eigenvalues & Eigenvectors**: Principal component analysis (PCA).",
                  quiz: [
                    {
                      id: "q2",
                      question: "What mathematical structure represents weights and dataset features in ML?",
                      options: ["Matrices & Tensors", "Scalar integers", "Strings", "Linked Lists"],
                      correctAnswerIndex: 0,
                      explanation: "Matrices and Tensors are used to store and transform feature matrices and model weights."
                    }
                  ]
                },
                {
                  nodeId: "ml_math_calculus",
                  title: "Calculus & Optimization",
                  description: "Derivatives, partial derivatives, gradients, and Gradient Descent.",
                  category: "required",
                  prerequisites: ["ml_math_linear_algebra"],
                  contentMarkdown: "# Calculus & Gradient Descent\n\nCalculus is essential for understanding how machine learning algorithms optimize loss functions.\n\n### Key Concepts:\n- **Gradients**: Direction of steepest ascent.\n- **Gradient Descent**: Iteratively updating weights to minimize loss (`W = W - alpha * grad`).\n- **Learning Rate (alpha)**: Step size during optimization.",
                  quiz: [
                    {
                      id: "q3",
                      question: "What does the gradient of a loss function represent?",
                      options: ["Direction of steepest increase in loss", "The accuracy score", "The number of parameters", "The dataset size"],
                      correctAnswerIndex: 0,
                      explanation: "The gradient points in the direction of the steepest increase; gradient descent moves in the opposite direction."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "2. Python & Data Preprocessing",
          order: 2,
          groups: [
            {
              groupName: "Python Ecosystem & EDA",
              side: "right",
              topics: [
                {
                  nodeId: "ml_python_numpy_pandas",
                  title: "Python, NumPy & Pandas",
                  description: "Data manipulation, vectorized arrays, and DataFrame operations.",
                  category: "required",
                  prerequisites: ["ml_what_is"],
                  contentMarkdown: "# Python Data Stack\n\nPython is the industry standard language for Machine Learning.\n\n### Essential Libraries:\n- **NumPy**: Fast N-dimensional array processing.\n- **Pandas**: DataFrame manipulation, filtering, and aggregation.\n- **Matplotlib / Seaborn**: Exploratory Data Analysis (EDA) visualization.",
                  quiz: [
                    {
                      id: "q4",
                      question: "Which library is primary for fast N-dimensional numerical array calculations in Python?",
                      options: ["NumPy", "Django", "Requests", "Flask"],
                      correctAnswerIndex: 0,
                      explanation: "NumPy provides high-performance vector and array computations."
                    }
                  ]
                },
                {
                  nodeId: "ml_data_preprocessing",
                  title: "Feature Scaling & Encoding",
                  description: "Handling missing values, One-Hot Encoding, StandardScaler, and MinMax.",
                  category: "required",
                  prerequisites: ["ml_python_numpy_pandas"],
                  contentMarkdown: "# Feature Engineering & Cleaning\n\nRaw data must be cleaned and transformed before feeding it into ML algorithms.\n\n### Key Steps:\n- **Categorical Encoding**: One-Hot Encoding vs Label Encoding.\n- **Feature Scaling**: StandardScaler (mean=0, std=1) & MinMax (0 to 1).\n- **Missing Values**: Mean/Median imputation.",
                  quiz: [
                    {
                      id: "q5",
                      question: "Why is Feature Scaling necessary for gradient-based ML algorithms?",
                      options: [
                        "It prevents features with large numeric scales from dominating model training",
                        "It deletes missing rows",
                        "It converts text into audio",
                        "It encrypts the dataset"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "Feature scaling ensures balanced gradient updates across all features."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "3. Classical Supervised Learning",
          order: 3,
          groups: [
            {
              groupName: "Regression & Classification",
              side: "left",
              topics: [
                {
                  nodeId: "ml_linear_logistic_regression",
                  title: "Linear & Logistic Regression",
                  description: "Ordinary Least Squares, Sigmoid function, Cost functions, and L1/L2 Regularization.",
                  category: "required",
                  prerequisites: ["ml_data_preprocessing"],
                  contentMarkdown: "# Linear & Logistic Regression\n\n- **Linear Regression**: Predicts continuous numerical values (`y = WX + b`).\n- **Logistic Regression**: Predicts probabilities for binary classification using the Sigmoid function (`1 / (1 + e^-z)`).\n- **Regularization**: L1 (Lasso) for feature selection, L2 (Ridge) for preventing overfitting.",
                  quiz: [
                    {
                      id: "q6",
                      question: "What function maps linear outputs into a 0 to 1 probability range for Logistic Regression?",
                      options: ["Sigmoid Function", "ReLU Function", "Linear Identity", "Step Function"],
                      correctAnswerIndex: 0,
                      explanation: "The Sigmoid function maps real numbers to probabilities between 0 and 1."
                    }
                  ]
                },
                {
                  nodeId: "ml_decision_trees_ensembles",
                  title: "Decision Trees & Random Forests",
                  description: "Gini Impurity, Information Gain, Bagging, and Ensemble Learning.",
                  category: "required",
                  prerequisites: ["ml_linear_logistic_regression"],
                  contentMarkdown: "# Decision Trees & Ensemble Methods\n\n- **Decision Trees**: Tree structures making decisions based on feature thresholds (Gini impurity / Entropy).\n- **Random Forests**: Ensemble of decision trees trained on random subsets of data and features (Bagging).",
                  quiz: [
                    {
                      id: "q7",
                      question: "How does a Random Forest reduce variance and overfitting compared to a single Decision Tree?",
                      options: [
                        "By averaging predictions across multiple random decision trees (Bagging)",
                        "By dropping all non-linear features",
                        "By using a single linear line",
                        "By increasing tree depth infinitely"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "Random Forest combines predictions from multiple trees trained on bootstrapped data subsets."
                    }
                  ]
                },
                {
                  nodeId: "ml_boosting_xgboost",
                  title: "Gradient Boosting (XGBoost, LightGBM)",
                  description: "Boosting mechanisms, sequential error correction, XGBoost, and LightGBM.",
                  category: "recommended",
                  prerequisites: ["ml_decision_trees_ensembles"],
                  contentMarkdown: "# Gradient Boosting Machines\n\nBoosting trains trees sequentially, where each new tree focuses on correcting the errors made by previous trees.\n\n### Leading Frameworks:\n- **XGBoost**: Extreme Gradient Boosting with regularization.\n- **LightGBM**: Fast leaf-wise tree growth.\n- **CatBoost**: Optimized for categorical data.",
                  quiz: [
                    {
                      id: "q8",
                      question: "What is the key difference between Bagging (Random Forest) and Boosting (XGBoost)?",
                      options: [
                        "Bagging trains trees independently in parallel; Boosting trains trees sequentially to correct prior errors",
                        "Bagging uses neural networks",
                        "Boosting only works on unlabelled data",
                        "Bagging requires GPU hardware"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "Boosting works sequentially, fitting each new model to residual errors of prior models."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "4. Unsupervised Learning & Clustering",
          order: 4,
          groups: [
            {
              groupName: "Clustering & Dimensionality Reduction",
              side: "right",
              topics: [
                {
                  nodeId: "ml_kmeans_clustering",
                  title: "K-Means & DBSCAN Clustering",
                  description: "Group unlabelled data, Elbow Method, Silhouette Score, and Density Clustering.",
                  category: "required",
                  prerequisites: ["ml_data_preprocessing"],
                  contentMarkdown: "# Clustering Algorithms\n\n- **K-Means**: Partitions data into K clusters based on centroid distance.\n- **DBSCAN**: Density-based clustering that discovers arbitrary shapes and isolates noise points.",
                  quiz: [
                    {
                      id: "q9",
                      question: "Which metric is commonly used to find the optimal number of clusters (K) in K-Means?",
                      options: ["Elbow Method / Inertia", "Accuracy Score", "Confusion Matrix", "Learning Rate"],
                      correctAnswerIndex: 0,
                      explanation: "The Elbow Method plots inertia against K to identify the point of diminishing returns."
                    }
                  ]
                },
                {
                  nodeId: "ml_pca_dimensionality_reduction",
                  title: "PCA & Dimensionality Reduction",
                  description: "Principal Component Analysis, Variance Explanation, t-SNE, and UMAP.",
                  category: "recommended",
                  prerequisites: ["ml_kmeans_clustering"],
                  contentMarkdown: "# Principal Component Analysis (PCA)\n\nPCA projects high-dimensional datasets onto lower-dimensional orthogonal components while preserving maximum variance.",
                  quiz: [
                    {
                      id: "q10",
                      question: "What is the primary goal of PCA in machine learning?",
                      options: [
                        "Reducing feature dimensions while preserving maximum data variance",
                        "Labeling unlabelled data automatically",
                        "Increasing model training time",
                        "Adding random noise"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "PCA compresses high-dimensional data into orthogonal components with minimal loss of variance."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "5. Deep Learning & Neural Networks",
          order: 5,
          groups: [
            {
              groupName: "Deep Learning Foundations",
              side: "left",
              topics: [
                {
                  nodeId: "ml_neural_networks_mlp",
                  title: "Perceptrons & Neural Networks",
                  description: "Multilayer Perceptron (MLP), Activation functions (ReLU, Softmax), Backpropagation.",
                  category: "required",
                  prerequisites: ["ml_linear_logistic_regression"],
                  contentMarkdown: "# Deep Learning & Neural Networks\n\nNeural networks consist of stacked layers of artificial neurons that learn non-linear representations.\n\n### Key Components:\n- **Layers**: Input, Hidden, and Output layers.\n- **Activation Functions**: ReLU, Leaky ReLU, Softmax, Sigmoid.\n- **Backpropagation**: Computing gradients using the chain rule.",
                  quiz: [
                    {
                      id: "q11",
                      question: "Which algorithm computes gradients of the loss function with respect to neural network weights?",
                      options: ["Backpropagation", "K-Means", "Decision Tree Split", "PCA"],
                      correctAnswerIndex: 0,
                      explanation: "Backpropagation applies the calculus chain rule backward from output to input layers."
                    }
                  ]
                },
                {
                  nodeId: "ml_pytorch_tensorflow",
                  title: "PyTorch & Deep Learning Frameworks",
                  description: "Tensors, Autograd, Model creation, Loss functions, and PyTorch Training Loops.",
                  category: "required",
                  prerequisites: ["ml_neural_networks_mlp"],
                  contentMarkdown: "# PyTorch Ecosystem\n\nPyTorch is the premier deep learning framework in research and industry.\n\n```python\nimport torch\nimport torch.nn as nn\n\nclass SimpleMLP(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.fc = nn.Linear(784, 10)\n    def forward(self, x):\n        return self.fc(x)\n```",
                  quiz: [
                    {
                      id: "q12",
                      question: "Which PyTorch module handles automatic differentiation for gradient calculation?",
                      options: ["torch.autograd", "torch.csv", "torch.json", "torch.web"],
                      correctAnswerIndex: 0,
                      explanation: "torch.autograd tracks graph operations and automatically computes gradients."
                    }
                  ]
                },
                {
                  nodeId: "ml_cnn_computer_vision",
                  title: "Convolutional Neural Networks (CNNs)",
                  description: "Convolutions, Pooling, Filters, ResNet architectures, and Computer Vision.",
                  category: "recommended",
                  prerequisites: ["ml_pytorch_tensorflow"],
                  contentMarkdown: "# Convolutional Neural Networks\n\nCNNs extract spatial hierarchies of visual features using convolutional kernels and pooling operations.",
                  quiz: [
                    {
                      id: "q13",
                      question: "What is the primary function of Max Pooling layers in CNNs?",
                      options: [
                        "Downsampling feature maps to reduce spatial size and parameter count",
                        "Increasing image resolution",
                        "Adding text labels to images",
                        "Creating artificial noise"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "Max Pooling reduces feature map dimensions while preserving dominant features."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "6. Modern AI & Transformers (LLMs)",
          order: 6,
          groups: [
            {
              groupName: "Transformers & LLMs",
              side: "right",
              topics: [
                {
                  nodeId: "ml_transformers_attention",
                  title: "Attention Mechanisms & Transformers",
                  description: "Self-Attention, Multi-Head Attention, Positional Encodings, Transformer Architecture.",
                  category: "required",
                  prerequisites: ["ml_pytorch_tensorflow"],
                  contentMarkdown: "# Transformer Architecture\n\nThe Transformer model (\"Attention Is All You Need\") revolutionized AI by replacing recurrent connections with Self-Attention.\n\n### Formula:\n`Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V`",
                  quiz: [
                    {
                      id: "q14",
                      question: "What key mechanism allows Transformers to process all tokens in parallel?",
                      options: ["Self-Attention Mechanism", "Sequential Recurrence", "Max Pooling", "Linear Regression"],
                      correctAnswerIndex: 0,
                      explanation: "Self-Attention allows parallel token interaction without sequential step-by-step loops."
                    }
                  ]
                },
                {
                  nodeId: "ml_llm_fine_tuning",
                  title: "LLMs, LoRA & PEFT Fine-Tuning",
                  description: "Pre-training vs Fine-tuning, Parameter-Efficient Fine-Tuning (LoRA, QLoRA), RAG.",
                  category: "recommended",
                  prerequisites: ["ml_transformers_attention"],
                  contentMarkdown: "# Large Language Models & LoRA\n\n- **Pre-training**: Training on trillions of tokens.\n- **LoRA (Low-Rank Adaptation)**: Freezes base weights and injects trainable rank decomposition matrices.\n- **RAG (Retrieval-Augmented Generation)**: Connecting LLMs with external Vector Databases.",
                  quiz: [
                    {
                      id: "q15",
                      question: "What is the main benefit of LoRA (Low-Rank Adaptation) when fine-tuning LLMs?",
                      options: [
                        "Dramatically reduces GPU memory requirements by updating only low-rank matrices",
                        "Deletes model weights",
                        "Slows down training intentionally",
                        "Disables attention heads"
                      ],
                      correctAnswerIndex: 0,
                      explanation: "LoRA freezes original parameters and updates small low-rank adapter matrices."
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          sectionName: "7. MLOps & Production Deployment",
          order: 7,
          groups: [
            {
              groupName: "MLOps & Model Serving",
              side: "left",
              topics: [
                {
                  nodeId: "ml_mlops_tracking_evaluation",
                  title: "MLOps, Experiment Tracking & Evaluation",
                  description: "MLflow, Weights & Biases, Optuna hyperparameter tuning, Data Drift monitoring.",
                  category: "required",
                  prerequisites: ["ml_pytorch_tensorflow"],
                  contentMarkdown: "# MLOps & Experiment Tracking\n\nProduction ML requires tracking experiments, code versions, metrics, and dataset lineages using tools like MLflow or W&B.",
                  quiz: [
                    {
                      id: "q16",
                      question: "What tool is commonly used to track metrics, parameters, and model artifacts during training?",
                      options: ["MLflow / Weights & Biases", "HTML5", "CSS Flexbox", "Postman"],
                      correctAnswerIndex: 0,
                      explanation: "MLflow and W&B log training parameters, loss curves, and model weights."
                    }
                  ]
                },
                {
                  nodeId: "ml_deployment_serving",
                  title: "Model Serving & Production Deployment",
                  description: "FastAPI serving, ONNX Runtime, TensorRT, Docker containerization, Triton server.",
                  category: "required",
                  prerequisites: ["ml_mlops_tracking_evaluation"],
                  contentMarkdown: "# Model Deployment & Serving\n\nConvert PyTorch/TensorFlow models to ONNX or TensorRT format and deploy REST/gRPC endpoints using Docker and FastAPI.",
                  quiz: [
                    {
                      id: "q17",
                      question: "Which format is widely used for cross-platform neural network model export and inference acceleration?",
                      options: ["ONNX (Open Neural Network Exchange)", "JPEG", "MP3", "CSV"],
                      correctAnswerIndex: 0,
                      explanation: "ONNX allows models trained in PyTorch/TensorFlow to run optimized on various hardware runtimes."
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
  }

  return {
    title: `${capTopic} Developer Roadmap`,
    description: `Complete step-by-step learning roadmap for ${capTopic} from absolute basics to production mastery.`,
    sections: [
      {
        sectionName: `1. Introduction to ${capTopic}`,
        order: 1,
        groups: [
          {
            groupName: "Basics & Overview",
            side: "left",
            topics: [
              {
                nodeId: `${slug}_what_is`,
                title: `What is ${capTopic}?`,
                description: `Core concepts, fundamental principles, and overview of ${cleanTopic}.`,
                category: "required",
                prerequisites: [],
                contentMarkdown: `# What is ${capTopic}?\n\n${capTopic} is a fundamental technology in modern software engineering.\n\n### Key Concepts:\n- **Core Definition**: Understanding the primary purpose and mechanics.\n- **Use Cases**: Real-world applications and business value.\n- **Prerequisites**: Key skills needed before mastering advanced topics.`,
                quiz: [
                  {
                    id: "q1",
                    question: `What is the main objective of learning ${capTopic}?`,
                    options: [
                      `Building a solid foundational understanding of ${cleanTopic} and its practical applications`,
                      "Memorizing theory without hands-on practice",
                      "Only focusing on deprecated legacy systems",
                      "Avoiding software design principles"
                    ],
                    correctAnswerIndex: 0,
                    explanation: `Mastering ${cleanTopic} starts with building strong conceptual foundations and practical skills.`
                  }
                ]
              },
              {
                nodeId: `${slug}_why_matters`,
                title: "Why It Matters & Key Benefits",
                description: "Industry relevance, architectural advantages, and practical applications.",
                category: "required",
                prerequisites: [],
                contentMarkdown: `# Why ${capTopic} Matters\n\nDiscover why ${cleanTopic} is essential for modern software architecture.\n\n### Benefits:\n- **Efficiency & Scalability**: Streamlining operations.\n- **Industry Demand**: High career relevance and engineering adoption.`,
                quiz: [
                  {
                    id: "q2",
                    question: `Why is ${capTopic} widely adopted in the industry?`,
                    options: [
                      "It provides scalable, effective solutions to complex engineering challenges",
                      "It has no practical application",
                      "It is completely obsolete",
                      "It cannot be deployed to servers"
                    ],
                    correctAnswerIndex: 0,
                    explanation: `${capTopic} is adopted because it solves real engineering challenges efficiently.`
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        sectionName: `2. Core Building Blocks & Mechanics`,
        order: 2,
        groups: [
          {
            groupName: "System Architecture",
            side: "right",
            topics: [
              {
                nodeId: `${slug}_architecture`,
                title: "System Architecture & Mechanics",
                description: "Deep dive into underlying mechanisms, components, and data flow.",
                category: "required",
                prerequisites: [`${slug}_what_is`],
                contentMarkdown: `# Core System Architecture\n\nLearn how ${cleanTopic} operates internally.\n\n### Key Topics:\n- Data structures and state flow\n- Internal component interaction\n- Standard design patterns`,
                quiz: [
                  {
                    id: "q3",
                    question: "What is crucial when designing system architecture?",
                    options: [
                      "Ensuring clear component interaction and state management",
                      "Ignoring data flow and error handling",
                      "Hardcoding configurations",
                      "Bypassing modular design"
                    ],
                    correctAnswerIndex: 0,
                    explanation: "Clear component interfaces and state management are essential for good architecture."
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        sectionName: `3. Tooling & Ecosystem`,
        order: 3,
        groups: [
          {
            groupName: "Developer Tooling",
            side: "left",
            topics: [
              {
                nodeId: `${slug}_tooling`,
                title: "Frameworks, Libraries & IDEs",
                description: "Essential developer tools, SDKs, and workflow environments.",
                category: "recommended",
                prerequisites: [`${slug}_architecture`],
                contentMarkdown: `# Tooling & Ecosystem\n\nExplore popular developer tooling for ${cleanTopic}.\n\n### Essential Tools:\n- Frameworks and SDKs\n- Testing and debugging environments\n- Version control & package management`,
                quiz: [
                  {
                    id: "q4",
                    question: "Why utilize modern developer tooling?",
                    options: [
                      "It accelerates development and enforces standard best practices",
                      "It makes testing impossible",
                      "It reduces code maintainability",
                      "It forces manual deployments"
                    ],
                    correctAnswerIndex: 0,
                    explanation: "Modern developer tools automate repetitive tasks and enforce quality standards."
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        sectionName: `4. Security & Production Deployment`,
        order: 4,
        groups: [
          {
            groupName: "Production Best Practices",
            side: "right",
            topics: [
              {
                nodeId: `${slug}_security`,
                title: "Security Auditing & Scaling",
                description: "Performance optimization, vulnerability checks, and production deployment.",
                category: "recommended",
                prerequisites: [`${slug}_tooling`],
                contentMarkdown: `# Production & Security Best Practices\n\nPrepare your ${cleanTopic} applications for production deployment.\n\n### Key Practices:\n- Automated testing & code coverage\n- Vulnerability checks and security hardening\n- Monitoring and performance tuning`,
                quiz: [
                  {
                    id: "q5",
                    question: "What is a mandatory requirement before production deployment?",
                    options: [
                      "Thorough testing, security auditing, and monitoring setup",
                      "Deploying without code review",
                      "Disabling logs and metrics",
                      "Exposing sensitive API credentials"
                    ],
                    correctAnswerIndex: 0,
                    explanation: "Production deployment requires rigorous testing, security checks, and monitoring."
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}


export async function generateLearningRoadmap(
  topic: string,
  grillContext?: { familiarity?: string; goals?: string[]; focusText?: string; level?: string },
  language: string = 'id'
) {
  const langPrompt = language === 'en'
    ? `CRITICAL LANGUAGE RULE: Output ALL text (roadmap title, description, section names, group names, topic titles, descriptions, contentMarkdown micro-lessons, and quiz questions) ENTIRELY IN ENGLISH.`
    : `CRITICAL LANGUAGE RULE: Output ALL text (roadmap title, description, section names, group names, topic titles, descriptions, contentMarkdown micro-lessons, and quiz questions) ENTIRELY IN BAHASA INDONESIA.`;

  let personalizationInstructions = '';
  if (grillContext) {
    const goalsStr = Array.isArray(grillContext.goals) && grillContext.goals.length > 0 
      ? grillContext.goals.join(', ') 
      : (grillContext.level || 'General Mastery');

    personalizationInstructions = `
USER PERSONALIZATION CONTEXT:
- Self Familiarity / Current Understanding: ${grillContext.familiarity || 'Belum paham sama sekali (Beginner)'}
- Primary Learning Goals (Multiple Selected): ${goalsStr}
- Specific Focus / Preferences: ${grillContext.focusText || 'None specified'}

CRITICAL PERSONALIZATION INSTRUCTION:
Tailor the roadmap sections, topic selection, and micro-lessons to directly reflect the user's familiarity level (${grillContext.familiarity || 'Beginner'}), primary learning goals (${goalsStr}), and specific focus (${grillContext.focusText}).`;
  }

  const systemPrompt = `You are an elite Educational Curriculum Director and Senior Technical Specialist.
Generate a comprehensive, highly granular, and structured learning roadmap for the topic requested by the user, modeled EXACTLY after high-quality visual roadmaps like roadmap.sh.
${langPrompt}
${personalizationInstructions}

CRITICAL ARCHITECTURAL RULES:
1. ABSOLUTE BASICS FIRST: Section 1 MUST ALWAYS start with the absolute fundamentals (e.g. "1. Introduction", containing "What is [Topic]?", "Why it matters?", "Applications & Uses").
2. GRANULAR TOPICS: Create 12 to 16 specific, actionable topic nodes (e.g. break concepts down into specific tools, platforms, or fundamentals).
3. SECTIONS & GROUPS: Group topics into 4 to 6 sequential Sections (e.g., "1. Introduction", "2. Core Fundamentals", "3. Development & Tooling", "4. Advanced Topics & Security").
4. CONCISE & FAST: Keep \`contentMarkdown\` concise (100-150 words per topic with key bullet points) and provide 1-2 sharp multiple choice quiz questions per topic.
5. DEPENDENCIES: Root topics in Section 1 MUST have empty prerequisites \`[]\`. Advanced topics list prerequisite topic IDs.

You MUST return ONLY a valid JSON object starting with { and ending with }. Do not include markdown \`\`\`json wrappers.

The JSON schema MUST be:
{
  "title": "Comprehensive Title (e.g. Blockchain Developer Roadmap)",
  "description": "Step-by-step roadmap from absolute basics to advanced mastery.",
  "sections": [
    {
      "sectionName": "1. Introduction to Blockchain",
      "order": 1,
      "groups": [
        {
          "groupName": "Basics & Overview",
          "side": "left",
          "topics": [
            {
              "nodeId": "intro_what_is",
              "title": "What is Blockchain?",
              "description": "Core concept of distributed ledger technology.",
              "category": "required",
              "prerequisites": [],
              "contentMarkdown": "# What is Blockchain?\\n\\nBlockchain is a decentralized digital ledger...",
              "quiz": [
                {
                  "id": "q1",
                  "question": "What is the primary characteristic of a blockchain ledger?",
                  "options": ["Centralized control", "Immutable & Decentralized", "Temporary storage", "Private by default"],
                  "correctAnswerIndex": 1,
                  "explanation": "Blockchain data is decentralized and immutable once written."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;

  try {
    return await callQwen(systemPrompt, `Generate a complete, granular roadmap.sh style learning roadmap for: ${topic}`);
  } catch (err: any) {
    console.warn("AI generation failed or quota exceeded, using intelligent fallback roadmap:", err.message || err);
    return createFallbackRoadmap(topic);
  }
}





