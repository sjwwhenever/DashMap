# Memories.ai Video Upload Test App

A Next.js TypeScript application for testing video uploads to the Memories.ai platform. This app provides a clean, responsive interface for uploading videos with drag & drop functionality, progress tracking, and real-time feedback.

## Features

- 🎥 **Drag & Drop Upload**: Intuitive interface for uploading multiple video files
- 📊 **Progress Tracking**: Real-time upload progress with speed and time estimates
- 🔧 **Format Validation**: Support for MP4, MOV, AVI, WebM, and OGG formats
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ⚡ **TypeScript**: Full type safety throughout the application
- 🎨 **Tailwind CSS**: Modern, utility-first styling
- 🔄 **Error Handling**: Comprehensive error handling with user-friendly messages

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API Integration**: Custom fetch-based client for Memories.ai
- **File Handling**: Native HTML5 File API with drag & drop

## Getting Started

### Prerequisites

- Node.js 18.17+ 
- npm or yarn
- Memories.ai API access (for actual uploads)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd memories-ai-upload
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Edit `.env.local` and add your API credentials:
```env
# Memories.ai API Configuration
NEXT_PUBLIC_MEMORIES_API_URL=https://api.memories.ai
MEMORIES_API_KEY=your_api_key_here

# Optional: MAVI API Configuration (if different)
NEXT_PUBLIC_MAVI_API_URL=https://api.openinterx.com
MAVI_API_KEY=your_mavi_api_key_here
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles with Tailwind
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main upload page
├── components/            # React components
│   └── VideoUpload.tsx    # Main upload component
├── hooks/                 # Custom React hooks
│   └── useVideoUpload.ts  # Upload state management
├── lib/                   # Utility libraries
│   └── memories-api.ts    # API client and utilities
└── types/                 # TypeScript type definitions
    └── memories.ts        # API and component types
```

## API Integration

The app is designed to work with the Memories.ai API endpoints:

- `POST /api/v1/videos/upload` - Upload video files
- `GET /api/v1/videos/{id}` - Get video metadata
- `GET /api/v1/videos/{id}/analysis` - Get video analysis results
- `DELETE /api/v1/videos/{id}` - Delete video

### API Client Features

- **Progress Tracking**: Real-time upload progress using XMLHttpRequest
- **Error Handling**: Comprehensive error handling with retry logic
- **File Validation**: Client-side validation for file type and size
- **TypeScript**: Fully typed API responses and requests

## Usage

1. **Upload Videos**: Drag and drop video files onto the upload area or click to browse
2. **Add Metadata**: Optionally add title, description, and tags
3. **Monitor Progress**: Watch real-time upload progress with speed and time estimates
4. **View Results**: See upload status and video details after completion

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_MEMORIES_API_URL` | Memories.ai API base URL | `https://api.memories.ai` |
| `MEMORIES_API_KEY` | API key for authentication | Required |
| `NEXT_PUBLIC_MAVI_API_URL` | Alternative MAVI API URL | `https://api.openinterx.com` |
| `MAVI_API_KEY` | MAVI API key | Optional |

### Upload Limits

- **Max File Size**: 500MB (configurable)
- **Supported Formats**: MP4, MOV, AVI, WebM, OGG
- **Multiple Files**: Supported

## Development Notes

### API Client

The API client (`src/lib/memories-api.ts`) is designed to be easily configurable:

```typescript
// Create client with custom configuration
const client = new MemoriesApiClient({
  baseUrl: 'https://your-api.com',
  apiKey: 'your-key',
  timeout: 30000
});
```

### Custom Hooks

The `useVideoUpload` hook manages all upload state and provides:

- File selection and validation
- Drag & drop functionality
- Upload progress tracking
- Error handling
- Preview management

### Component Architecture

- **VideoUpload**: Main upload component with UI
- **useVideoUpload**: State management hook
- **memories-api**: API client and utilities
- **Types**: Comprehensive TypeScript interfaces

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the API server allows requests from your domain
2. **File Size Limits**: Check both client and server file size limits
3. **API Key**: Verify your API key is correctly set in environment variables
4. **Network Issues**: Check firewall and proxy settings

### Debug Mode

Enable debug logging by setting `NODE_ENV=development`:

```bash
NODE_ENV=development npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For API-related questions, please refer to the [Memories.ai documentation](https://memories.ai/docs/).

For application issues, please create an issue in this repository.