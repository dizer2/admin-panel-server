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
	cart: [
		{
		  _id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'MenuItem',
		  },
		  name: String,
		  description: String,
		  price: Number,
		  amount: Number, 
		},
	  ],
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
	amount: {
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
	  const { login, password, cart } = req.body;
  
	  const existingUser = await User.findOne({ login });
  
	  if (existingUser) {
		return res.status(400).json({ error: 'User with this login already exists' });
	  }
  
	  const user = new User({ login, password, cart: [] });
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
	  const { name, description, price, amount } = req.body;
  
	  const menuItem = new MenuItem({ name, description, price, amount });
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


app.get('/all-menu-item', async (req, res) => {
	try {
	  const allMenuItems = await MenuItem.find();
	  res.json(allMenuItems);
	} catch (error) {
	  console.error('Error:', error);
	  res.status(500).send('Something Went Wrong');
	}
});

  
app.get('/menu-items/:id', async (req, res) => {
	const menuItemId = req.params.id;
	
	try {
	  if (menuItemId) {
		const menuItem = await MenuItem.findById(menuItemId);
		if (menuItem) {
		  return res.json(menuItem);
		} else {
		  return res.status(404).json({ error: 'Menu item not found' });
		}
	  } else {
		const allMenuItems = await MenuItem.find();
		res.json(allMenuItems);
	  }
	} catch (error) {
	  console.error('Error:', error);
	  res.status(500).send('Something Went Wrong');
	}
  });

  app.post('/add-to-cart/:login/:itemId', async (req, res) => {
	const login = req.params.login;
	const itemId = req.params.itemId;
  
	try {
	  const user = await User.findOne({ login });
	  if (!user) {
		return res.status(404).json({ error: 'User not found' });
	  }
  
	  const menuItem = await MenuItem.findOne({ _id: itemId });
	  if (!menuItem) {
		return res.status(404).json({ error: 'Menu item not found' });
	  }
  
	  // Check if the item already exists in the user's cart
	  const existingCartItemIndex = user.cart.findIndex(
		(cartItem) => cartItem._id.toString() === itemId
	  );
  
	  if (existingCartItemIndex !== -1) {
		// Item exists; increase the amount
		user.cart[existingCartItemIndex].amount++;
	  } else {
		// Item does not exist; add it as a new entry with amount 1
		user.cart.push({
		  _id: menuItem._id,
		  name: menuItem.name,
		  description: menuItem.description,
		  price: menuItem.price,
		  amount: 1,
		});
	  }
  
	  // Save the updated user object to the database
	  await user.save();
  
	  // Return the updated user object
	  res.json(user);
	} catch (error) {
	  console.error('Error:', error);
	  res.status(500).send('Something Went Wrong');
	}
  });
  
  app.post('/remove-iteam-cart/:login/:itemId', async (req, res) => {
	const login = req.params.login;
	const itemId = req.params.itemId;
  
	try {
	  const user = await User.findOne({ login });
	  if (!user) {
		return res.status(404).json({ error: 'User not found' });
	  }
  
	  // Find the index of the item to remove in the user's cart
	  const itemIndex = user.cart.findIndex((cartItem) => cartItem._id.toString() === itemId);
  
	  if (itemIndex !== -1) {
		// Remove the item from the user's cart
		user.cart.splice(itemIndex, 1);
  
		// Save the updated user object to the database
		await user.save();
  
		// Return the updated user object
		res.json(user);
	  } else {
		return res.status(404).json({ error: 'Menu item not found in the cart' });
	  }
	} catch (error) {
	  console.error('Error:', error);
	  res.status(500).send('Something Went Wrong');
	}
  });
  
  

app.listen(5000);