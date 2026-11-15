export const WEBSITE_AI_MODEL_OPTIONS = [
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    label: "NVIDIA Nemotron-3 Ultra 550B (New Flagship)",
    provider: "nvidia",
    badge: "New · 550B Ultra",
    description:
      "Flagship 550B reasoning & conversation model from NVIDIA NIM (build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b)."
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    label: "NVIDIA Nemotron-3 Super 120B",
    provider: "nvidia",
    badge: "120B Super",
    description: "High-precision 120B NVIDIA model for Vedic astrology, catalog analysis & Hindi/English."
  },
  {
    id: "nvidia/llama-3.1-nemotron-70b-instruct",
    label: "NVIDIA Llama-3.1-Nemotron-70B-Instruct",
    provider: "nvidia",
    badge: "Default Primary",
    description: "Fast, instruction-tuned NVIDIA model for shopping assistance & customer support."
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Meta Llama-3.3-70B-Instruct (NIM)",
    provider: "nvidia",
    badge: "Multilingual",
    description: "Balanced 70B general assistant hosted on NVIDIA NIM."
  },
  {
    id: "mistralai/mixtral-8x22b-instruct-v0.1",
    label: "Mixtral 8x22B Instruct (NIM)",
    provider: "nvidia",
    badge: "Fast MoE",
    description: "Mixture-of-Experts model for fast storefront responses."
  },
  {
    id: "deepseek-ai/deepseek-r1",
    label: "DeepSeek-R1 Reasoning (NIM)",
    provider: "nvidia",
    badge: "Deep Reasoning",
    description: "Step-by-step analytical reasoning model via NVIDIA NIM."
  },
  {
    id: "gemini-4-hydrogen",
    label: "Google Gemini 4 Hydrogen",
    provider: "gemini",
    badge: "Google Tool + Search",
    description: "Latest Gemini model with native store tool execution, Google Search grounding & Hinglish support."
  },
  {
    id: "gemini-3.8-flash",
    label: "Google Gemini 3.8 Flash",
    provider: "gemini",
    badge: "Fast Multimodal",
    description: "High-speed Gemini Flash model for storefront & Vedic consultation tasks."
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Google Gemini 3.1 Flash Lite",
    provider: "gemini",
    badge: "Ultra Low Latency",
    description: "Lightweight Gemini Flash variant for instant replies."
  }
];

export const NIM_MODEL_OPTIONS = WEBSITE_AI_MODEL_OPTIONS;
