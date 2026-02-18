const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env vars
dotenv.config({ path: 'd:\\nextjs\\AgriSense\\backend\\.env' });

const User = require('./models/User');
const Farm = require('./models/Farm');

const connectDB = async () => {
    try {
        const uri = "mongodb+srv://codeyodha4040_db_user:boPYYC7l9WXisYkM@cluster0.eze2upr.mongodb.net/?appName=Cluster0";
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('MongoDB Connected');

        let output = '';

        const users = await User.find({});
        output += `Found ${users.length} users:\n`;
        users.forEach(u => output += ` - ${u.name} (${u.email}) ID: ${u._id}\n`);

        const farms = await Farm.find({});
        output += `\nFound ${farms.length} farms:\n`;
        farms.forEach(f => {
            output += ` - Farm: ${f.name}\n`;
            output += `   ID: ${f._id}\n`;
            output += `   User ID: ${f.userId}\n`;
            output += `   Active: ${f.isActive}\n`;
            output += '-------------------\n';
        });

        fs.writeFileSync('db_dump.txt', output);
        console.log('Data dumped to db_dump.txt');

        process.exit();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

connectDB();
