# ChatGPT Clone - Setup Guide

A pixel-perfect ChatGPT clone built with Next.js, TypeScript, and modern web technologies following Galaxy.ai technical standards.

## 🚀 Features

- **Pixel-perfect ChatGPT UI** - Exact replication of ChatGPT's interface
- **AI Chat with Streaming** - Real-time responses using Vercel AI SDK
- **User Authentication** - Secure login with Clerk
- **File Uploads** - Image and document support via Uploadcare
- **Conversation Memory** - Persistent chat history with MongoDB
- **Message Editing** - Edit and regenerate responses
- **Speech-to-Text** - Voice input support
- **Mobile Responsive** - Optimized for all devices

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS + ShadCN UI
- **Authentication**: Clerk
- **Database**: MongoDB with Mongoose
- **File Storage**: Cloudinary + Uploadcare
- **AI**: Vercel AI SDK with OpenAI
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB database
- OpenAI API key
- Clerk account
- Cloudinary account
- Uploadcare account

## 🔧 Environment Setup

Create a `.env.local` file in the root directory:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/chatgpt-clone
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatgpt-clone

# Cloudinary Configuration (for file storage)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_cloudinary_api_key
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Uploadcare Configuration (for frontend file uploads)
NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY=your_uploadcare_public_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

## 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatgpt-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy the environment variables above to `.env.local`
   - Fill in your actual API keys and credentials

4. **Set up external services**

   **MongoDB:**
   - Create a MongoDB database (local or Atlas)
   - Update `MONGODB_URI` in your `.env.local`

   **OpenAI:**
   - Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Add to `OPENAI_API_KEY` in `.env.local`

   **Clerk Authentication:**
   - Create account at [Clerk](https://clerk.com)
   - Create new application
   - Copy publishable key and secret key to `.env.local`

   **Cloudinary:**
   - Create account at [Cloudinary](https://cloudinary.com)
   - Get cloud name, API key, and create upload preset
   - Add to `.env.local`

   **Uploadcare:**
   - Create account at [Uploadcare](https://uploadcare.com)
   - Get public key from dashboard
   - Add to `.env.local`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Sign in with Clerk
   - Start chatting!

## 🏗 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── chat/          # Chat streaming endpoint
│   │   ├── upload/        # File upload endpoints
│   │   └── webhooks/      # Webhook handlers
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── providers/         # Context providers
│   ├── ui/                # ShadCN UI components
│   └── ChatUI.tsx         # Main chat interface
├── lib/                   # Utility libraries
│   ├── db.ts              # Database connection
│   ├── models.ts          # Mongoose schemas
│   ├── memory.ts          # Memory management
│   └── cloudinary.ts      # Cloudinary config
└── types/                 # TypeScript type definitions
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
   - Push code to GitHub
   - Connect repository to Vercel
   - Add environment variables in Vercel dashboard

2. **Deploy**
   - Vercel will automatically deploy on push to main
   - Custom domains can be configured in Vercel dashboard

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## 🔒 Security Features

- **Authentication**: Secure user authentication with Clerk
- **API Protection**: Protected API routes with user verification
- **File Upload Security**: Secure file uploads with signature verification
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: Built-in rate limiting for API endpoints

## 📱 Mobile Support

- **Responsive Design**: Optimized for all screen sizes
- **Touch Gestures**: Native mobile interactions
- **PWA Ready**: Can be installed as a mobile app
- **Offline Support**: Basic offline functionality

## 🐛 Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check if all environment variables are set

2. **Database connection issues**
   - Verify MongoDB URI is correct
   - Ensure MongoDB is running (if using local instance)
   - Check network connectivity for Atlas

3. **Authentication not working**
   - Verify Clerk keys are correct
   - Check if domain is whitelisted in Clerk dashboard

4. **File uploads failing**
   - Verify Cloudinary and Uploadcare credentials
   - Check file size limits
   - Ensure upload presets are configured

### Getting Help

- Check the console for error messages
- Review the API logs in Vercel dashboard
- Ensure all environment variables are properly set
- Verify external service configurations

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the coding standards
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

Built with ❤️ following Galaxy.ai technical standards
