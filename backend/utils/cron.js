const cron = require('node-cron');
const Inventory = require('../models/Inventory');
const { sendEmail } = require('./email');

function initCron() {
  console.log('Initializing scheduled stock alert cron job (running every minute for testing)...');

  cron.schedule('* * * * *', async () => {
    try {
      const threshold = parseInt(process.env.STOCK_ALERT_THRESHOLD) || 20;
      
      // Find items below threshold that haven't been flagged for email notification yet
      const lowStockItems = await Inventory.find({
        stock: { $lt: threshold },
        adminNotified: false
      });

      if (lowStockItems.length === 0) {
        return; // All good
      }

      console.log(`[Cron Job] Found ${lowStockItems.length} items below stock threshold.`);

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@pizzaapp.com';
      const itemsListText = lowStockItems.map(item => `- ${item.name}: ${item.stock} units left (Threshold: ${item.threshold || threshold} units)`).join('\n');
      const itemsListHtml = lowStockItems.map(item => `<li><strong>${item.name}</strong>: <span style="color:red; font-weight:bold;">${item.stock}</span> units left (Threshold: ${item.threshold || threshold} units)</li>`).join('');

      const subject = `⚠️ Alert: Low Stock Warning for Pizza Ingredients`;
      const text = `Dear Admin,\n\nThe following pizza ingredients have fallen below their threshold level:\n\n${itemsListText}\n\nPlease restock these ingredients as soon as possible.\n\nBest Regards,\nPizzaApp Automator`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px;">⚠️ Low Stock Notification</h2>
          <p>Dear Admin,</p>
          <p>The following pizza ingredients have fallen below their configured stock threshold:</p>
          <ul style="line-height: 1.6; font-size: 15px;">
            ${itemsListHtml}
          </ul>
          <p>Please log in to the Admin Dashboard to restock these items.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">This is an automated system message. Do not reply to this email.</p>
        </div>
      `;

      const mailResult = await sendEmail({ to: adminEmail, subject, text, html });

      if (mailResult.success) {
        // Mark items as notified so we don't spam the admin on subsequent cron cycles
        const ids = lowStockItems.map(item => item._id);
        await Inventory.updateMany(
          { _id: { $in: ids } },
          { $set: { adminNotified: true } }
        );
        console.log(`[Cron Job] Successfully sent stock notification email and flagged items in DB.`);
      } else {
        console.error(`[Cron Job] Failed to send stock notification email:`, mailResult.error);
      }
    } catch (err) {
      console.error('[Cron Job] Error checking stock levels:', err);
    }
  });
}

module.exports = { initCron };
