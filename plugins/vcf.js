// plugins/groupvcf.js
const adminModule = require('../lib/isAdmin');
// Ensure we get the function correctly
const isAdmin = typeof adminModule === 'function' ? adminModule : adminModule.isAdmin;

// prevent double-processing if a message re-emits
const processed = new Set();

module.exports = {
  // 1. Command Settings
  command: 'vcf',
  alias: ['gvcf', 'groupcontacts', 'dumpcontacts'],
  description: 'Generates a VCF file containing all group members.',
  category: 'tools',

  /**
   * @param {import('@whiskeysockets/baileys').WASocket} sock
   * @param {object} m
   * @param {object} ctx
   */
  execute: async (sock, m, ctx) => {
    const { reply } = ctx;

    try {
      const mid = m?.key?.id;
      if (mid) {
        if (processed.has(mid)) return;
        processed.add(mid);
        setTimeout(() => processed.delete(mid), 5 * 60 * 1000);
      }

      // 1. Check if it's a group
      if (!m.key.remoteJid.endsWith('@g.us')) {
          return reply('❌ This command can only be used in groups.');
      }

      // 2. Check Admin Permissions
      const sender = m.key.participant || m.key.remoteJid;
      
      // DESTRUCTURE THE RESULT HERE
      // isAdmin returns { isSenderAdmin, isBotAdmin }
      const { isSenderAdmin } = await isAdmin(sock, m.chat, sender);

      // Check the specific boolean value
      if (!isSenderAdmin) {
          return reply('❌ You must be a Group Admin to use this command.');
      }

      // React Processing
      await sock.sendMessage(m.chat, { react: { text: '🔄', key: m.key } });

      // 3. Fetch Group Data
      const metadata = await sock.groupMetadata(m.chat);
      const participants = metadata.participants;
      const groupName = metadata.subject || 'Group';

      // 4. Generate VCF Content
      let vcfContent = '';
      
      for (const p of participants) {
          if (!p.id) continue;
          const num = p.id.split('@')[0];
          const contactName = `${groupName.slice(0, 15)} - ${num}`;

          vcfContent += 'BEGIN:VCARD\n'
                      + 'VERSION:3.0\n'
                      + `FN:${contactName}\n`
                      + `TEL;type=CELL;type=VOICE;waid=${num}:+${num}\n`
                      + 'END:VCARD\n';
      }

      // 5. Send the file
      await sock.sendMessage(m.chat, {
          document: Buffer.from(vcfContent, 'utf-8'),
          mimetype: 'text/vcard',
          fileName: `${groupName} Contacts.vcf`,
          caption: `✅ *Contact List Created*\n\n📁 Group: ${groupName}\n👥 Members: ${participants.length}\n\nDownload and open to save all contacts.`
      }, { quoted: m });

      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    } catch (err) {
      console.error('Group VCF error:', err);
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
      reply(`❌ Error: ${err.message}`);
    }
  }
};