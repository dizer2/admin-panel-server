require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const { User, MenuItem } = require('./app');

const token = process.env.TELEGRAMTOKEN;
const bot = new TelegramBot(token, { polling: true });

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const userStates = new Map();
const userInputs = {};


const states = {
  NAME: 1,
  DESCRIPTION: 2,
  PRICE: 3
};

async function sendUsersToTelegram(chatId) {
  try {
    const users = await User.find();
    const userArray = users.map(user => `Login: ${user.login} \nID: ${user._id} \nCart : ${user.cart} \n \n`).join('\n');
    await bot.sendMessage(chatId, `List of Users:\n${userArray}`);
  } catch (error) {
    console.error('Error:', error);
    await bot.sendMessage(chatId, 'Failed to fetch user data.');
  }
}

async function sendItemToTelegram(chatId) {
  try {
    const menus = await MenuItem.find();
    const manuArray = menus.map(menu => `Name: ${menu.name} \nID: ${menu._id} \nDescription: ${menu.description} \nPrice: ${menu.price} \n `).join('\n');
    await bot.sendMessage(chatId, `List of Menu:\n${manuArray}`);
  } catch (error) {
    console.error('Error:', error);
    await bot.sendMessage(chatId, 'Failed to fetch menu data.');
  }
}


bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const keyboard = {
    reply_markup: {
      keyboard: [["/start"]],
      resize_keyboard: true,
    },
  };

  bot.sendMessage(chatId, 'Please select one command 😁 \n 1) /getUsers \n 2) /getMenu \n 3) /addItem \n 4) /changeItem \n 5) /changeStatus \n 6) /removeItem', keyboard);
});

bot.onText(/\/getUsers/, (msg) => {
  const chatId = msg.chat.id;
  sendUsersToTelegram(chatId);
});

bot.onText(/\/getMenu/, (msg) => {
  const chatId = msg.chat.id;
  sendItemToTelegram(chatId);
});


bot.onText(/\/addItem/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  userStates.set(userId, states.NAME);
  userInputs[userId] = {}; 

  bot.sendMessage(chatId, 'Please enter the name of the new menu item:');
});

bot.on('text', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const currentState = userStates.get(userId);

  switch (currentState) {
    case states.NAME:

      userStates.set(userId, states.DESCRIPTION);
      userInputs[userId] = { name: msg.text };
      bot.sendMessage(chatId, 'Please enter the description of the new menu item:');
      break;

    case states.DESCRIPTION:

      userStates.set(userId, states.PRICE);
      userInputs[userId].description = msg.text;
      bot.sendMessage(chatId, 'Please enter the price of the new menu item:');
      break;

    case states.PRICE:

    const { name, description } = userInputs[userId];
      const price = parseFloat(msg.text);

      if (name && description && !isNaN(price)) {
        const amount = 0;
        const status = "Not started"
        const menuItem = new MenuItem({ name, description, price, amount, status });
        try {
          const result = await menuItem.save();
          if (result) {
            bot.sendMessage(chatId, 'Menu item added successfully.');
          } else {
            bot.sendMessage(chatId, 'Failed to add the menu item.');
          }
        } catch (error) {
          console.error('Error:', error);
          bot.sendMessage(chatId, 'Failed to add the menu item.');
        }


        userStates.delete(userId);
        delete userInputs[userId];
      } else {
        bot.sendMessage(chatId, 'Invalid input. Please provide a valid name, description, and price.');
      }
      break;
  }
});



bot.onText(/\/changeItem/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  let menuItemToUpdate = null;

  bot.sendMessage(chatId, 'Please enter the ID of the menu item you want to change:');


  bot.on('text', async (msg) => {
    if (msg.from.id === userId) {
      const itemId = msg.text.trim();


      menuItemToUpdate = await MenuItem.findById(itemId);
      if (menuItemToUpdate) {
        bot.sendMessage(chatId, `Menu Item ID: ${menuItemToUpdate._id}\nName: ${menuItemToUpdate.name}\nDescription: ${menuItemToUpdate.description}\nPrice: ${menuItemToUpdate.price}`);
        bot.sendMessage(chatId, 'Please enter the new name for the menu item:');
        
        bot.removeListener('text');
        
        bot.on('text', (msg) => {
          if (msg.from.id === userId && menuItemToUpdate) {
            const newName = msg.text.trim();
            menuItemToUpdate.name = newName;
            bot.sendMessage(chatId, 'Please enter the new description for the menu item:');
            
            bot.removeListener('text');
            
            bot.on('text', (msg) => {
              if (msg.from.id === userId && menuItemToUpdate) {

                const newDescription = msg.text.trim();
                menuItemToUpdate.description = newDescription;
                bot.sendMessage(chatId, 'Please enter the new price for the menu item:');
                
                bot.removeListener('text');
                
                bot.on('text', async (msg) => {
                  if (msg.from.id === userId && menuItemToUpdate) {
                    const newPrice = parseFloat(msg.text.trim());
                    menuItemToUpdate.price = newPrice;

                    try {
                      const updatedMenuItem = await menuItemToUpdate.save();
                      bot.sendMessage(chatId, 'Menu item updated successfully.');
                      bot.sendMessage(chatId, `Updated Menu Item ID: ${updatedMenuItem._id}\nName: ${updatedMenuItem.name}\nDescription: ${updatedMenuItem.description}\nPrice: ${updatedMenuItem.price}`);
                    } catch (error) {
                      console.error('Error:', error);
                      bot.sendMessage(chatId, 'Failed to update the menu item.');
                    }

                    bot.removeListener('text');
                  }
                });
              }
            });
          }
        });
      } else {
        bot.sendMessage(chatId, 'Menu item with the specified ID not found.');
        
        bot.removeListener('text');
      }
    }
  });
});


bot.onText(/\/changeStatus/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  let targetUser = null;

  bot.sendMessage(chatId, 'Please enter the user ID:');

  bot.on('text', async (msg) => {
    if (msg.from.id === userId) {
      const targetUserId = msg.text.trim();

      targetUser = await User.findById(targetUserId);

      if (targetUser) {
        bot.sendMessage(chatId, `User ID: ${targetUser._id}\nLogin: ${targetUser.login}\nCart: ${targetUser.cart}`);
        bot.sendMessage(chatId, 'Please enter the ID of the item in the user\'s cart to change its status:');
        
        bot.removeListener('text');
        
        bot.on('text', async (msg) => {
          if (msg.from.id === userId) {
            const itemId = msg.text.trim();

            const cartItem = targetUser.cart.id(itemId);

            if (cartItem) {
              bot.sendMessage(chatId, `Item ID: ${cartItem._id}\nName: ${cartItem.name}\nStatus: ${cartItem.status}`);
              bot.sendMessage(chatId, 'Please enter the new status for the item:');
              
              bot.removeListener('text');
              
              bot.on('text', async (msg) => {
                if (msg.from.id === userId) {
                  const newStatus = msg.text.trim();
                  cartItem.status = newStatus;

                  try {
                    await targetUser.save();  
                    bot.sendMessage(chatId, 'Item status updated successfully.');
                    bot.sendMessage(chatId, `Updated Item ID: ${cartItem._id}\nName: ${cartItem.name}\nStatus: ${cartItem.status}`);

                  } catch (error) {
                    console.error('Error:', error);
                    bot.sendMessage(chatId, 'Failed to update the item status.');
                  }

                  bot.removeListener('text');
                }
              });
            } else {
              bot.sendMessage(chatId, 'Item with the specified ID not found in the user\'s cart.');
              
              bot.removeListener('text');
            }
          }
        });
      } else {
        bot.sendMessage(chatId, 'User with the specified ID not found.');
        
        bot.removeListener('text');
      }
    }
  });
});


bot.onText(/\/removeItem/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  bot.sendMessage(chatId, 'Please enter the ID of the item you want to remove:');

  bot.on('text', async (msg) => {
    if (msg.from.id === userId) {
      const itemId = msg.text.trim();

      try {
        const removedItem = await MenuItem.findByIdAndRemove(itemId);
        if (removedItem) {
          bot.sendMessage(chatId, 'Item removed successfully.');
        } else {
          bot.sendMessage(chatId, 'Item with the specified ID not found.');
        }
      } catch (error) {
        console.error('Error:', error);
        bot.sendMessage(chatId, 'Failed to remove the item.');
      }

      bot.removeListener('text');
    }
  });
});
