<script setup lang="ts">
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { RouteName, routeName } from "@/router";
import { useChatStore } from "./chat.store";
import ButtonLink from "@/ui/ButtonLink.vue";

const store = useChatStore();
const { t } = useI18n();

onMounted(() => store.loadMyChats());
</script>

<template>
  <main class="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
    <header>
      <h1 class="font-medium">{{ t("chats.title") }}</h1>
      <p class="mt-1 text-caption text-muted-foreground">{{ t("chats.subtitle") }}</p>
    </header>

    <section class="mt-8">
      <p v-if="store.myChatsLoading" class="text-caption text-muted-foreground">
        {{ t("chats.loading") }}
      </p>

      <p v-else-if="store.myChatsError" role="alert" class="text-caption text-destructive">
        {{ store.myChatsError }}
      </p>

      <p v-else-if="store.myChats.length === 0" class="text-caption text-muted-foreground">
        {{ t("chats.empty") }}
      </p>

      <ul v-else class="space-y-3">
        <li v-for="chat in store.myChats" :key="chat.id">
          <ButtonLink
            :to="{ name: routeName(RouteName.CHAT), params: { chatId: chat.id } }"
            class="block rounded-md border border-border bg-card p-4 shadow-sm transition hover:bg-accent"
          >
            <span class="min-w-0 truncate font-medium">{{ chat.partnerEmail }}</span>
          </ButtonLink>
        </li>
      </ul>
    </section>
  </main>
</template>
