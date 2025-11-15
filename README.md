# AutoCaption4Lora

<div align="center">
  <h3>🎨 AI-Powered Image Captioning for LoRA Training Datasets</h3>
  <p>Automatically generate high-quality captions for your image training datasets using Google's Gemini AI</p>
  
  ![Next.js](https://img.shields.io/badge/Next.js-15-black)
  ![React](https://img.shields.io/badge/React-19-blue)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
  ![License](https://img.shields.io/badge/License-MIT-green)
</div>

---

## ✨ Features

- 🤖 **AI-Powered Captioning** - Leverages Google Gemini's vision models for accurate image descriptions
- 🎯 **LoRA-Optimized** - Captions formatted specifically for LoRA training workflows
- 🎨 **Modern UI** - Beautiful, responsive interface with real-time progress tracking
- 📦 **Batch Processing** - Process multiple images efficiently with rate limiting
- ⚙️ **Highly Configurable** - Control caption length, focus, guidance, and more
- 💾 **ZIP Export** - Download all processed images with captions in one click
- 🔄 **Multiple Models** - Support for various Gemini models (Flash, Pro, etc.)
- 📊 **Progress Tracking** - Visual status indicators for each image (pending/processing/completed/error)
- 🎭 **Checkpoint Support** - Optimized for WAN-2.2, SDXL, FLUX, and Pony Diffusion

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MandarGogate/AutoCaption4Lora.git
   cd AutoCaption4Lora
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

1. **Select Settings**
   - Choose your Gemini AI model
   - Set your training goal (Identity, Style, Object, or Concept)
   - Configure file prefix and trigger keyword
   - Select target base model (WAN-2.2, SDXL, FLUX, or Pony)

2. **Configure Captions**
   - Add custom caption guidance (optional)
   - Adjust guidance strength (0-1)
   - Set negative hints to exclude certain elements
   - Choose caption length (Short, Medium, or Long)
   - Enable strict focus for subject-only descriptions

3. **Upload Images**
   - Drag and drop images or click to select
   - Supports JPG, PNG, and WebP formats
   - Preview all uploaded images with status indicators

4. **Process & Download**
   - Click "Process Images" to start captioning
   - Monitor progress in real-time
   - Download ZIP file containing images and .txt caption files

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **AI**: [Google Gemini API](https://ai.google.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📁 Project Structure

```
AutoCaption4Lora/
├── app/
│   ├── api/              # API routes
│   │   ├── download/     # ZIP download endpoint
│   │   ├── logs/         # Logging endpoint
│   │   ├── models/       # Model listing endpoint
│   │   ├── process/      # Image processing endpoint
│   │   ├── test/         # API testing endpoint
│   │   └── upload/       # Image upload endpoint
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page component
├── components/
│   └── ui/               # UI components (shadcn)
├── lib/
│   ├── gemini.ts         # Gemini API integration
│   ├── store.ts          # File system storage
│   └── utils.ts          # Utility functions
├── public/               # Static assets
└── uploads/              # Temporary upload directory
```

## ⚙️ Configuration

### Caption Formatting

Captions are formatted based on your selected checkpoint:

- **WAN-2.2**: `{keyword}, {description} (neg: {negatives})`
- **SDXL**: `{keyword}, {description} (neg: {negatives})`
- **FLUX**: `{keyword}, {description} (neg: {negatives})`
- **Pony**: `{keyword}, {description} (neg: {negatives})`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Gemini](https://ai.google.dev/) for the powerful vision AI
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Next.js](https://nextjs.org/) team for the amazing framework

## 📞 Support

If you encounter any issues or have questions:
- Open an [issue](https://github.com/MandarGogate/AutoCaption4Lora/issues)
- Star ⭐ this repository if you find it helpful!

---

<div align="center">
  Made with ❤️ for the AI art community
</div>
