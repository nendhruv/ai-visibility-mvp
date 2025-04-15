# Market Intel AI

A powerful AI-driven market intelligence platform that helps businesses understand their market position and track their visibility in AI responses.

## Features

- User authentication with JWT
- Company profile management
- Competitor analysis
- AI visibility tracking
- Market intelligence insights
- Beautiful modern UI with Tailwind CSS

## Prerequisites

- Node.js 18+ and npm
- MongoDB 4.4+
- Git

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd market-intel-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Then edit `.env` and add your MongoDB URI and JWT secret.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js app router pages and API routes
- `/src/components` - Reusable React components
- `/src/lib` - Utility functions and database connection
- `/src/models` - MongoDB models
- `/src/types` - TypeScript type definitions

## Authentication

The application uses JWT-based authentication with the following features:
- Secure password hashing with bcrypt
- HTTP-only cookies for token storage
- Protected API routes and pages
- Rate limiting for API endpoints

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 