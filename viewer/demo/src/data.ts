export interface TreeNode {
  id: string;
  label: string;
  description: string;
  children?: TreeNode[];
}

// Sample dependency tree data (hardcoded)
export const dependencyTree: TreeNode[] = [
  {
    id: 'main',
    label: 'main',
    description: 'Entry point — orchestrates the full pipeline execution',
    children: [
      {
        id: 'data-loader',
        label: 'data-loader',
        description: 'Loads raw input from disk or remote storage',
        children: [
          {
            id: 'file-reader',
            label: 'file-reader',
            description: 'Reads local JSONL / CSV files line by line',
          },
          {
            id: 's3-reader',
            label: 's3-reader',
            description: 'Streams objects from S3-compatible buckets',
            children: [
              {
                id: 'auth-provider',
                label: 'auth-provider',
                description: 'Handles AWS credential refresh and signing',
              },
            ],
          },
        ],
      },
      {
        id: 'preprocessor',
        label: 'preprocessor',
        description: 'Cleans, normalises and tokenises raw text fields',
        children: [
          {
            id: 'tokenizer',
            label: 'tokenizer',
            description: 'BPE tokenizer with custom vocabulary support',
          },
          {
            id: 'normalizer',
            label: 'normalizer',
            description: 'Unicode normalisation, lowercasing and stop-word removal',
          },
        ],
      },
      {
        id: 'model-runner',
        label: 'model-runner',
        description: 'Dispatches inference requests to the LLM backend',
        children: [
          {
            id: 'openai-client',
            label: 'openai-client',
            description: 'OpenAI-compatible REST client with rate-limit backoff',
            children: [
              {
                id: 'retry-policy',
                label: 'retry-policy',
                description: 'Exponential back-off with jitter for transient errors',
              },
              {
                id: 'token-counter',
                label: 'token-counter',
                description: 'Tracks prompt / completion tokens per request',
              },
            ],
          },
          {
            id: 'response-parser',
            label: 'response-parser',
            description: 'Extracts structured fields from raw model output',
          },
        ],
      },
      {
        id: 'output-writer',
        label: 'output-writer',
        description: 'Persists processed results to the configured sink',
        children: [
          {
            id: 'json-serializer',
            label: 'json-serializer',
            description: 'Serialises results to pretty-printed JSONL',
          },
        ],
      },
    ],
  },
  {
    id: 'scheduler',
    label: 'scheduler',
    description: 'Manages job queues and concurrency limits',
    children: [
      {
        id: 'worker-pool',
        label: 'worker-pool',
        description: 'Thread-pool with configurable parallelism',
      },
      {
        id: 'rate-limiter',
        label: 'rate-limiter',
        description: 'Token-bucket limiter shared across all workers',
      },
    ],
  },
];
