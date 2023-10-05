const mongoose = require('mongoose');
require('dotenv').config();
const db = mongoose.connection;

console.log(process.env.DB_URL);
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to database:', err);
  });

const UserSchema = new mongoose.Schema({
	login: {
		type: String,
		required: true,
	},
	password: {
		type: String,
		required: true,
		unique: true,
	},
});



const User = mongoose.model('users', UserSchema);
User.createIndexes();

const MenuItemSchema = new mongoose.Schema({
	name: {
	  type: String,
	  required: true,
	},
	description: {
	  type: String,
	  unique: false, // Allow multiple documents to have null descriptions
	},
	price: {
	  type: Number,
	  required: true,
	},
  });
  
MenuItemSchema.index({ name: 1, description: 1 }, { unique: true, partialFilterExpression: { description: { $exists: true } } });
  

const MenuItem = mongoose.model('menuItems', MenuItemSchema);
MenuItem.createIndexes();


const express = require('express');
const app = express();
const cors = require("cors");

console.log("App listen at port 5000");
app.use(express.json());
app.use(cors());
app.get("/", (req, resp) => {

	resp.send("App is Working");
});	
	

app.post('/register', async (req, res) => {
	try {
	  const { login, password } = req.body;
  
	  const existingUser = await User.findOne({ login });
  
	  if (existingUser) {
		return res.status(400).json({ error: 'User with this login already exists' });
	  }
  
	  const user = new User({ login, password });
	  let result = await user.save();
  
	  result = result.toObject();
  
	  if (result) {
		console.log(result);
		return res.send(result);
	  } else {
		console.log('User already registered');
		return res.status(400).send('User already registered');
	  }
	} catch (e) {
	  console.error('Error:', e);
	  return res.status(500).send('Something Went Wrong');
	}
});



app.get('/get-user', async (req, res) => {
	try {
	  const { login, password } = req.body;
  
	  const user = await User.findOne({ login, password });
  
	  if (user) {
		const sanitizedUser = user.toObject();
		res.json(sanitizedUser);
	  } else {
		console.log('User not found or incorrect password');
		res.status(404).json({ error: 'User not found or incorrect password' });
	  }
	} catch (error) {
	  console.log(`Error: ${error}`);
	  res.status(500).json({ error: 'Error getting user' });
	}
});


app.post('/add-menu-item', async (req, res) => {
	try {
	  const { name, description, price } = req.body;
  
	  const menuItem = new MenuItem({ name, description, price });
	  const result = await menuItem.save();
	  
	  if (result) {
		return res.json({
		  message: 'Menu item added successfully',
		  menuItem: result,
		});
	  } else {
		return res.status(400).send('Failed to add menu item');
	  }
	} catch (error) {
	  console.error('Error:', error);
	  return res.status(500).send('Something Went Wrong');
	}
});




  

app.listen(5000);