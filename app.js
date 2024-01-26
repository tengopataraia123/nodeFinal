const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('./db');
const User = require('./models/user');
const Message = require('./models/message');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.set('view engine', 'ejs'); // Change view engine to EJS
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Routes

// Register
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, username, password: hashedPassword });
    await user.save();

    res.redirect('/login');
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

//Index
app.get('/',(req,res)=> {
    return res.redirect('/login')
})

// Login
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send('Invalid username or password');
  }

  res.redirect(`/chat/${user._id}`);
});

// Chat
app.get('/chat/:userId', async (req, res) => {
  const userId = req.params.userId;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).send('User not found');
  }

  const messages = await Message.find({}).populate('userId');
  res.render('chat', { user, messages });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  socket.on('chat message', async (msg, userId) => {
    const message = new Message({ text: msg, userId });
    await message.save();

    io.emit('chat message', { text: msg, username: (await User.findById(userId)).username });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
