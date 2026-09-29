const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "listbox.json");

if (!fs.existsSync(DATA_DIR))
	fs.mkdirSync(DATA_DIR, { recursive: true });

function loadData() {
	try {
		if (!fs.existsSync(DATA_FILE))
			return {};

		return JSON.parse(
			fs.readFileSync(DATA_FILE, "utf8")
		);
	} catch (e) {
		console.error("[LISTBOX LOAD ERROR]", e);
		return {};
	}
}

function saveData(data) {
	try {
		fs.writeFileSync(
			DATA_FILE,
			JSON.stringify(data, null, 2),
			"utf8"
		);
	} catch (e) {
		console.error("[LISTBOX SAVE ERROR]", e);
	}
}

// শুধু Date — Time নেই
function getDate() {
	const d = new Date();

	return `${String(d.getDate()).padStart(2, "0")}/${String(
		d.getMonth() + 1
	).padStart(2, "0")}/${d.getFullYear()}`;
}

async function getBotID(api) {
	try {
		if (global.GoatBot?.botID)
			return String(global.GoatBot.botID);

		return String(api.getCurrentUserID());
	} catch (e) {
		return String(api.getCurrentUserID());
	}
}

async function getUserName(api, userID) {
	try {
		const info = await api.getUserInfo(
			String(userID)
		);

		return (
			info?.[String(userID)]?.name ||
			info?.[userID]?.name ||
			"Unknown"
		);
	} catch (e) {
		return "Unknown";
	}
}

module.exports = {
	config: {
		name: "listbox",
		version: "5.0",
		author: "Alamin",
		countDown: 5,
		role: 0,

		shortDescription: {
			en: "Show live bot group list"
		},

		longDescription: {
			en: "Show all groups where the bot is currently present"
		},

		category: "BOX CHAT",

		guide: {
			en: "{pn}"
		}
	},

	// ==========================================
	// LIVE EVENT HANDLER
	// ==========================================
	onEvent: async function ({ api, event }) {
		try {
			const botID = await getBotID(api);
			const data = loadData();

			// ==========================================
			// BOT ADDED TO GROUP
			// ==========================================
			if (
				event.logMessageType === "log:subscribe" &&
				event.logMessageData?.addedParticipants
			) {
				const addedUsers =
					event.logMessageData.addedParticipants;

				const botAdded = addedUsers.some(
					user =>
						String(user.userFbId) ===
						String(botID)
				);

				if (!botAdded)
					return;

				const threadID =
					String(event.threadID);

				// যে ব্যক্তি Bot-কে Add করেছে
				const adderID = event.author
					? String(event.author)
					: "Not Recorded";

				let adderName = "Not Recorded";

				if (adderID !== "Not Recorded") {
					adderName =
						await getUserName(
							api,
							adderID
						);
				}

				// Live group name
				let groupName = "Unknown Group";

				try {
					const info =
						await api.getThreadInfo(
							threadID
						);

					groupName =
						info?.threadName ||
						"Unknown Group";
				} catch (e) {}

				data[threadID] = {
					groupName,
					addedByName: adderName,
					addedDate: getDate()
				};

				saveData(data);

				return;
			}

			// ==========================================
			// BOT REMOVED / LEFT GROUP
			// ==========================================
			if (
				event.logMessageType ===
				"log:unsubscribe"
			) {
				const leftID =
					event.logMessageData
						?.leftParticipantFbId;

				if (
					leftID &&
					String(leftID) ===
						String(botID)
				) {
					const threadID =
						String(event.threadID);

					if (data[threadID]) {
						delete data[threadID];
						saveData(data);
					}
				}
			}
		} catch (e) {
			console.error(
				"[LISTBOX EVENT ERROR]",
				e
			);
		}
	},

	// ==========================================
	// LISTBOX COMMAND
	// ==========================================
	onStart: async function ({ api, message }) {
		try {
			const data = loadData();

			// ==========================================
			// FACEBOOK থেকে সরাসরি CURRENT THREAD LIST
			// ==========================================
			const threads =
				await api.getThreadList(
					1000,
					null,
					["INBOX"]
				);

			// শুধু বর্তমানে থাকা GROUP
			const liveGroups =
				threads.filter(thread =>
					thread.isGroup === true ||
					thread.threadType === "GROUP"
				);

			const liveIDs = new Set(
				liveGroups.map(thread =>
					String(thread.threadID)
				)
			);

			// ==========================================
			// LIVE না থাকা পুরোনো GROUP DELETE
			// ==========================================
			for (const id of Object.keys(data)) {
				if (!liveIDs.has(String(id))) {
					delete data[id];
				}
			}

			// ==========================================
			// CURRENT LIVE GROUP UPDATE
			// ==========================================
			for (const thread of liveGroups) {
				const threadID =
					String(thread.threadID);

				// Facebook থেকে Live Name
				const groupName =
					thread.name ||
					thread.threadName ||
					"Unknown Group";

				// আগে থেকে Data থাকলে সেটা রাখবে
				if (!data[threadID]) {
					data[threadID] = {
						groupName,
						addedByName:
							"Not Recorded",
						addedDate: getDate()
					};
				} else {
					// Group Name সবসময় Live update
					data[threadID].groupName =
						groupName;

					// পুরোনো data-তে date না থাকলে
					if (!data[threadID].addedDate) {
						if (
							data[threadID]
								.addedDateTime
						) {
							data[threadID].addedDate =
								String(
									data[threadID]
										.addedDateTime
								).split(" • ")[0];
						} else {
							data[threadID].addedDate =
								getDate();
						}

						delete data[threadID]
							.addedDateTime;
					}

					if (
						!data[threadID]
							.addedByName
					) {
						data[threadID]
							.addedByName =
							"Not Recorded";
					}
				}
			}

			saveData(data);

			// ==========================================
			// FINAL LIVE GROUP ARRAY
			// ==========================================
			const groups = liveGroups.map(
				thread => {
					const id =
						String(thread.threadID);

					return {
						id,
						...data[id],

						// Name সরাসরি Live thread থেকে
						groupName:
							thread.name ||
							thread.threadName ||
							data[id]?.groupName ||
							"Unknown Group"
					};
				}
			);

			// ==========================================
			// HEADER
			// ==========================================
			let msg =
				"╭━━━━━━━━━━━━━━━━╮\n" +
				"┃   ✦ 𝐋𝐈𝐒𝐓 𝐁𝐎𝐗 ✦\n" +
				"╰━━━━━━━━━━━━━━━━╯\n\n";

			// ==========================================
			// LIVE GROUP LIST
			// ==========================================
			groups.forEach((group, index) => {
				const serial = String(
					index + 1
				).padStart(2, "0");

				msg +=
					`╭─〔 ${serial} 〕━━━━━━━━╮\n` +
					`│ 🏠 𝐆𝐫𝐨𝐮𝐩 : ${group.groupName}\n` +
					`│\n` +
					`│ 🆔 𝐈𝐃 : ${group.id}\n` +
					`│\n` +
					`│ 👤 𝐀𝐝𝐝𝐞𝐝 𝐁𝐲 : ${group.addedByName}\n` +
					`│\n` +
					`│ 📅 𝐀𝐝𝐝𝐞𝐝 : ${group.addedDate}\n` +
					`╰━━━━━━━━━━━━━━━━╯\n\n`;
			});

			// ==========================================
			// FOOTER
			// ==========================================
			msg +=
				"╭━━━━━━━━━━━━━━━━╮\n" +
				`┃ 📦 𝐓𝐨𝐭𝐚𝐥 𝐆𝐫𝐨𝐮𝐩 : ${groups.length}\n` +
				"┃ 🤖 𝐁𝐨𝐭 𝐒𝐭𝐚𝐭𝐮𝐬 : 🟢 𝐎𝐍𝐋𝐈𝐍𝐄\n" +
				"╰━━━━━━━━━━━━━━━━╯\n\n" +

				"╭━━━━━━━━━━━━━━━━╮\n" +
				"┃ ✦ 𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲\n" +
				"┃    ᴀʟꫝᴍɪɴ 𝐁𝐎𝐓\n" +
				"╰━━━━━━━━━━━━━━━━╯";

			return message.reply(msg);

		} catch (e) {
			console.error(
				"[LISTBOX ERROR]",
				e
			);

			return message.reply(
				"❌ 𝐋𝐈𝐒𝐓 𝐁𝐎𝐗 𝐋𝐎𝐀𝐃 𝐄𝐑𝐑𝐎𝐑"
			);
		}
	}
};
