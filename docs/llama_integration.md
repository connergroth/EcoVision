# Ollama Integration Guide for EcoVision

This guide explains how to set up and use Ollama with your EcoVision application to enhance the recycling information with AI-generated content.

## What is Ollama?

[Ollama](https://ollama.com/) is an open-source tool that makes it easy to run large language models (LLMs) locally on your machine. It simplifies the process of downloading, setting up, and running models like Llama 2, Mistral, and others.

## Advantages for EcoVision

- **Privacy**: All data stays on your machine
- **No API costs**: Free to use without usage limits
- **Low latency**: No network delays when generating content
- **Full control**: Customize models and parameters as needed

## Setup Instructions

### 1. Install Ollama

#### Windows
1. Download the installer from [ollama.com/download/windows](https://ollama.com/download/windows)
2. Run the installer and follow the prompts
3. Ollama will start automatically and be available at http://localhost:11434

#### macOS
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Download the Mistral Model

Mistral 7B is recommended for the EcoVision project due to its strong performance with recyclable materials and environmental knowledge:

```bash
ollama pull mistral
```

For PowerShell users, you can use the provided setup script:

```powershell
.\setup-ollama.ps1
```

### 3. Update Your EcoVision Configuration

Update your `.env` file with the following settings:

```
LLAMA_API_URL=http://localhost:11434/api/generate
LLAMA_API_KEY=
LLAMA_MODEL_NAME=mistral
LLAMA_MAX_TOKENS=512
USE_LLAMA_ENHANCED_INFO=True
```

Note that `LLAMA_API_KEY` is empty as Ollama doesn't require authentication when running locally.

### 4. Test the Integration

Run the test script to verify Ollama is working correctly:

```powershell
.\test-ollama-api.ps1
```

This will send a sample recycling prompt and display the response.

## Alternative Models

While Mistral 7B is recommended, you can try other models that might work well for the recycling domain:

| Model | Size | Command | Notes |
|-------|------|---------|-------|
| Llama 2 | 7B | `ollama pull llama2` | Good general knowledge |
| Phi-2 | 2.7B | `ollama pull phi` | Smaller, faster model |
| Gemma | 7B | `ollama pull gemma:7b` | Google's model with strong reasoning |
| Neural Beagle | 7B | `ollama pull neuralbeagle` | Strong factual knowledge |

To switch models, just change the `LLAMA_MODEL_NAME` in your `.env` file to match the model name.

## Troubleshooting

### Model Downloading Issues

If you have trouble downloading models:

1. Check your internet connection
2. Ensure you have sufficient disk space (models range from 2-4GB)
3. Try restarting Ollama: `ollama serve`

### API Connection Issues

If your application can't connect to Ollama:

1. Verify Ollama is running with `Get-Process ollama` (PowerShell) or `ps aux | grep ollama` (Linux/Mac)
2. Check the URL is correct: `http://localhost:11434/api/generate`
3. Ensure no firewall is blocking the connection

### Slow Generation

If text generation is slow:

1. Try a smaller model like Phi-2
2. Reduce `LLAMA_MAX_TOKENS` to a smaller value (e.g., 256)
3. If you have a GPU, Ollama will use it automatically for faster inference

## Advanced Configuration

### Using GPU Acceleration

Ollama automatically uses your GPU if available, but you can customize GPU usage:

```bash
# Limit GPU memory usage (in MiB)
OLLAMA_GPU_LAYERS=35 ollama serve
```

### Running on a Remote Server

To access Ollama from other machines on your network:

```bash
OLLAMA_HOST=0.0.0.0 ollama serve
```

Then update your client to connect to the server's IP address instead of localhost.

### Custom Models

You can create custom models with specific parameters for recycling information:

1. Create a Modelfile:
```
FROM mistral
PARAMETER temperature 0.4
PARAMETER num_ctx 4096
SYSTEM You are an expert on recycling and environmental sustainability.
```

2. Create and use the custom model:
```bash
ollama create recycling-expert -f Modelfile
```

3. Update your `.env` to use this model:
```
LLAMA_MODEL_NAME=recycling-expert
```