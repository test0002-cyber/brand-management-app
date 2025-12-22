#!/bin/bash

echo "🚀 Starting Brand Management Application"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Error: Please run this script from the brand-management-app directory"
    exit 1
fi

echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Backend dependency installation failed"
    exit 1
fi

echo "🔧 Initializing database..."
npm run init-db
if [ $? -ne 0 ]; then
    echo "❌ Database initialization failed"
    exit 1
fi

echo "✅ Backend setup complete!"

echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend dependency installation failed"
    exit 1
fi

echo "✅ Frontend setup complete!"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open a new terminal window"
echo "2. Start the backend: cd backend && npm start"
echo "3. In another terminal, start the frontend: cd frontend && npm start"
echo ""
echo "🌐 The application will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "🔑 Demo login credentials:"
echo "   Admin: username=admin, password=admin123"
echo "   User:  username=user1, password=user123"
echo ""
echo "📚 Check README.md for detailed documentation"