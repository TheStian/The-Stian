// plugins/report.js

// prevent double-processing if a message re-emits
const processed = new Set();

module.exports = {
  // 1. Command Settings
  command: 'reportbug',
  alias: ['report', 'bug'],
  description: 'Report a bug or issue to the bot developer.',
  category: 'general',

  /**
   * @param {import('@whiskeysockets/baileys').WASocket} sock
   * @param {object} m
   * @param {object} ctx
   */
  execute: async (sock, m, ctx) => {
    // 2. Destructure the context
    // We assume 'prefix' is available in ctx (passed from your handler), otherwise default to '.'
    const { text, reply, prefix } = ctx; 
    const cmdPrefix = prefix || '.'; 

    try {
      // 3. De-duplication Logic
      const mid = m?.key?.id;
      if (mid) {
        if (processed.has(mid)) return;
        processed.add(mid);
        setTimeout(() => processed.delete(mid), 5 * 60 * 1000);
      }

      // --- THE STIAN ---

      // Validation: Check if the user provided text
      if (!text) {
          return reply(`❌ Please describe the issue.\n\nExample: *${cmdPrefix}reportbug* Play command isn't working`);
      }

      // Show processing reaction
      await sock.sendMessage(m.chat, { react: { text: '📨', key: m.key } });

      const sender = m.sender || m.key.participant || m.key.remoteJid;
      const senderName = m.pushName || "User";

      // Format the bug report for the owner
      const bugReportMsg = `
*🐞 BUG REPORT*

👤 *User*: @${sender.split("@")[0]}
💬 *Issue*: ${text}
⚙️ *Version*: 1.0.0
`;

      // Format the confirmation for the user
      const confirmationMsg = `
Hi ${senderName}, 👋

Your bug report has been forwarded to my developer.  
Please wait for a reply. ✅

*Details sent:*
${bugReportMsg}
`;

      // 4. Send to Owner (Your Number)
      const ownerJid = "254705615631@s.whatsapp.net";

      // Send report to you
      await sock.sendMessage(ownerJid, { 
          text: bugReportMsg, 
          mentions: [sender] 
      });

      // Send confirmation to the user
      await sock.sendMessage(m.chat, { 
          text: confirmationMsg, 
          mentions: [sender] 
      }, { quoted: m });

      // React Success
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

      // --- CODE ENDS HERE ---

    } catch (err) {
      console.error('Report command error:', err);
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      reply('❌ Failed to send bug report.');
    }
  }
};