<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RouteName, routeName } from "@/router";
import { useSessionStore } from "@/modules/auth/session.store";
import Button from "@/ui/button/Button.vue";
import Input from "@/ui/Input.vue";
import { useChatStore } from "./chat.store";
import ButtonLink from "@/ui/ButtonLink.vue";

const props = defineProps<{ chatId: string }>();

const session = useSessionStore();
const store = useChatStore();
const { t } = useI18n();

const draft = ref("");
const scroller = ref<HTMLElement | null>(null);

// The chat screen only has an id; borrow the partner's name from my-chats.
const partnerEmail = computed(
  () => store.myChats.find((c) => c.id === props.chatId)?.partnerEmail ?? t("chat.fallbackTitle"),
);

const scrollToBottom = () => {
  void nextTick(() => {
    const el = scroller.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
};

const enter = () => {
  if (store.myChats.length === 0) void store.loadMyChats();
  store.enterChat(props.chatId);
};

onMounted(enter);
onUnmounted(() => store.leaveChat());
// Switching directly from one chat to another reuses this component.
watch(() => props.chatId, enter);
watch(() => store.messages.length, scrollToBottom);

const submit = () => {
  if (store.send(draft.value)) draft.value = "";
};
</script>

<template>
  <main class="mx-auto flex h-full w-full max-w-2xl flex-col px-5 py-6 sm:px-6">
    <header class="flex items-center justify-between gap-4 border-b border-border pb-4">
      <ButtonLink :to="{ name: routeName(RouteName.CHATS) }">{{ t("chat.back") }}</ButtonLink>
      <span class="min-w-0 flex-1 truncate text-center font-medium">{{ partnerEmail }}</span>
      <span
        class="shrink-0 text-caption"
        :class="store.connected ? 'text-muted-foreground' : 'text-destructive'"
      >
        {{ store.connected ? t("chat.live") : t("chat.connecting") }}
      </span>
    </header>

    <div ref="scroller" class="flex-1 space-y-2 overflow-y-auto py-4">
      <p v-if="store.historyError" role="alert" class="text-caption text-destructive">
        {{ store.historyError }}
      </p>
      <p
        v-else-if="store.messages.length === 0"
        class="mt-8 text-center text-caption text-muted-foreground"
      >
        {{ t("chat.empty") }}
      </p>

      <div
        v-for="message in store.messages"
        :key="message.id"
        class="flex"
        :class="message.senderId === session.user?.id ? 'justify-end' : 'justify-start'"
      >
        <p
          class="max-w-[80%] rounded-md px-3.5 py-2 text-caption break-words shadow-sm"
          :class="
            message.senderId === session.user?.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-card-foreground'
          "
        >
          {{ message.body }}
        </p>
      </div>
    </div>

    <p v-if="store.rejection" role="alert" class="pb-2 text-caption text-destructive">
      {{ store.rejection }}
    </p>

    <form class="flex items-end gap-2 border-t border-border pt-4" @submit.prevent="submit">
      <div class="flex-1">
        <Input v-model="draft" :label="t('chat.message')" autocomplete="off" />
      </div>
      <Button type="submit" :disabled="!draft.trim()">{{ t("chat.send") }}</Button>
    </form>
  </main>
</template>
