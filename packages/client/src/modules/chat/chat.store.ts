import { defineStore } from "pinia";
import { translate } from "@/lib/i18n";
import type { ChatSocket } from "./chat-socket.service";
import { connectChatSocket } from "./chat-socket.service";
import * as chat from "./chat.service";
import type { ChatSummaryView, MessageView } from "./chat.service";

// The live socket lives outside reactive state — Vue must never proxy the
// WebSocket wrapper.
let socket: ChatSocket | null = null;

export const useChatStore = defineStore("chat", {
  state: () => ({
    myChats: [] as ReadonlyArray<ChatSummaryView>,
    myChatsLoading: false,
    myChatsError: null as string | null,

    currentChatId: null as string | null,
    messages: [] as ReadonlyArray<MessageView>,
    historyError: null as string | null,
    connected: false,
    // The last server (or transport) rejection of a send, shown to the sender.
    rejection: null as string | null,
  }),
  actions: {
    async loadMyChats() {
      this.myChatsLoading = true;
      this.myChatsError = null;
      const result = await chat.myChats();
      if (result.ok) this.myChats = result.data;
      else this.myChatsError = result.message;
      this.myChatsLoading = false;
    },

    openChat(roomId: string, partnerId: string) {
      return chat.openChat(roomId, partnerId);
    },

    enterChat(chatId: string) {
      // Drop any previous chat's socket and state first.
      this.leaveChat();
      this.currentChatId = chatId;
      // Show history immediately, even before the socket is up.
      void this.loadHistory(chatId);

      let hasConnected = false;
      socket = connectChatSocket({
        onMessage: (message) => {
          // The user-wide socket carries every chat; keep only the open one.
          if (message.chatId !== this.currentChatId) return;
          if (this.messages.some((m) => m.id === message.id)) return;
          this.messages = [...this.messages, message];
        },
        onRejected: (reason) => {
          // Ignore a late rejection from a socket we have already left behind.
          if (this.currentChatId !== chatId) return;
          this.rejection = reason;
        },
        onConnectedChange: (connected) => {
          this.connected = connected;
          if (connected) {
            // Re-sync history after a reconnect so a network blip loses nothing.
            if (hasConnected) void this.loadHistory(chatId);
            hasConnected = true;
          }
        },
      });
    },

    async loadHistory(chatId: string) {
      const result = await chat.listMessages(chatId);
      // A different chat may have been entered while the request was in flight.
      if (this.currentChatId !== chatId) return;
      if (result.ok) this.messages = result.data;
      else this.historyError = result.message;
    },

    send(body: string) {
      const text = body.trim();
      if (!text || this.currentChatId === null || socket === null) return false;
      this.rejection = null;
      const sent = socket.send(this.currentChatId, text);
      if (!sent) this.rejection = translate("errors.disconnected");
      return sent;
    },

    leaveChat() {
      socket?.close();
      socket = null;
      this.currentChatId = null;
      this.messages = [];
      this.historyError = null;
      this.connected = false;
      this.rejection = null;
    },
  },
});
