const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const port = process.env.PORT || 3000;
const url = "mongodb://127.0.0.1:27017/profilemany";

// Set up view engine and static folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'res', 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Configure express-session
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Database Connection
mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
  .catch(error => console.error(error));

// Profile Schema and Model
const profileSchema = new mongoose.Schema({
  name: String,
  expert: String,
  experience: String,
  image: String,
});
const Profile = mongoose.model('Profile', profileSchema);

// User Schema and Model
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
const User = mongoose.model('User', userSchema);

// Middleware for Authentication
const requireAuth = (req, res, next) => {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/', (req, res) => {
  res.render('home');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const newUser = new User({ email, password });
    await newUser.save();
    res.render('addprofile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });

  if (user) {
    req.session.isAuthenticated = true;
    res.redirect('/checkmsg');
  } else {
    res.status(401).send('Unauthorized');
  }
});

app.get('/profile', async (req, res) => {
  try {
    const profiles = await Profile.find();
    console.log(profiles);
    res.render('profile', { profiles: profiles });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'public/images'),
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    callback(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

app.get('/profile/add', requireAuth, (req, res) => {
  res.render('addProfile');
});
const upload = multer({ storage: storage });
app.use(express.urlencoded({ extended: true }));




app.post('/profile/add', upload.single('image'), async (req, res) => {
  try {
    const { name, expert,experience } = req.body;
    const newProfile = new Profile({ name, expert,experience });

    if (req.file) {
      newProfile.image = '' + req.file.filename;
    }

    const savedProfile = await newProfile.save();
    console.log('New profile added:', savedProfile);

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/checkmsg', requireAuth, (req, res) => {
  res.render('checkmsg');
});
app.get('/mes', (req, res) => {
  res.render('mes');
});

// Chat Functionality
io.on('connection', (socket) => {
  console.log('User connected...');

  socket.on('message', (msg) => {
    socket.broadcast.emit('message', msg);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});


