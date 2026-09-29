module.exports = {
  config: {
    name: "leave",
    version: "2.0",
    author: "Alamin",
    countDown: 5,
    role: 2,
    shortDescription: {
      en: "Make the bot leave any group by ID"
    },
    category: "box chat"
  },

  onStart: async function ({ api, event, args }) {

    // Group ID না দিলে Leave করবে না
    if (!args[0]) {
      return api.sendMessage(
        "❌ Group ID দিতে হবে!\n\nউদাহরণ:\n.leave 1636207407956480",
        event.threadID
      );
    }

    const targetGroupID = String(args[0]).trim();

    // ID valid কিনা
    if (!/^\d+$/.test(targetGroupID)) {
      return api.sendMessage(
        "❌ সঠিক Group ID দিন।",
        event.threadID
      );
    }

    try {
      // Target group-এর তথ্য নেওয়া
      const info = await api.getThreadInfo(targetGroupID);

      if (!info || !info.isGroup) {
        return api.sendMessage(
          "❌ এই ID কোনো Group Chat-এর নয়।",
          event.threadID
        );
      }

      const botID = api.getCurrentUserID();

      // Target group-এ Bot আছে কিনা পরীক্ষা
      const participants = info.participantIDs || [];

      if (!participants.includes(botID)) {
        return api.sendMessage(
          "❌ এই Group-এ Bot নেই।\n\n🆔 ID : " + targetGroupID,
          event.threadID
        );
      }

      // Target group-এই বিদায়ী মেসেজ পাঠাবে
      const message =
`•──── 👑 𝐁𝐎𝐒𝐒 𝐎𝐑𝐃𝐄𝐑 ────•

𝐌𝐲 𝐁𝐨𝐬𝐬 - 𝐀𝐥𝐚𝐦𝐢𝐧 🙋‍♂️
আমাকে 𝐋𝐞𝐚𝐯𝐞 নিতে বলেছে। 😫

➜ 𝐈'𝐦 𝐋𝐞𝐚𝐯𝐢𝐧𝐠... 🥹
❤️ সবাই ভালো থাকবেন। 🕊️

•────── ᴀʟꫝᴍɪɴ 𝐁𝐎𝐓 ──────•`;

      await api.sendMessage(message, targetGroupID);

      // ১০ সেকেন্ড পর Target Group থেকে Bot Leave করবে
      setTimeout(() => {
        api.removeUserFromGroup(
          botID,
          targetGroupID,
          err => {
            if (err) {
              console.error("Leave Error:", err);
            }
          }
        );
      }, 10000);

    } catch (error) {
      console.error("Leave Command Error:", error);

      return api.sendMessage(
        "❌ Group থেকে Leave নেওয়া সম্ভব হয়নি।\n\n🆔 ID : " +
        targetGroupID,
        event.threadID
      );
    }
  }
};
