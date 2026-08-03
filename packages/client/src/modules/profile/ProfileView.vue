<script setup lang="ts">
import { Gender } from "@landline/domain/user/enums";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { MessageKey } from "@/lib/i18n";
import { loadProfile, type ProfileData } from "./profile.service";

const { locale, t } = useI18n();
const profile = ref<ProfileData | null>(null);
const loading = ref(true);
const unavailable = ref(false);
const error = ref<string | null>(null);

const genderMessages = {
  [Gender.FEMALE]: "gender.female",
  [Gender.MALE]: "gender.male",
  [Gender.NONBINARY]: "gender.nonbinary",
} satisfies Readonly<Record<Gender, MessageKey>>;

const genderLabel = (gender: Gender) => t(genderMessages[gender]);
const interestedIn = computed(() =>
  profile.value === null
    ? ""
    : new Intl.ListFormat(locale.value, { style: "long", type: "conjunction" }).format(
        profile.value.interestedIn.map(genderLabel),
      ),
);
const dateOfBirth = computed(() => {
  if (profile.value === null) return "";
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${profile.value.dateOfBirth}T00:00:00Z`));
});
const country = computed(() => {
  if (profile.value === null) return "";
  try {
    return (
      new Intl.DisplayNames(locale.value, { type: "region" }).of(profile.value.city.country) ??
      profile.value.city.country
    );
  } catch {
    return profile.value.city.country;
  }
});

onMounted(async () => {
  const result = await loadProfile();
  loading.value = false;
  if (!result.ok) {
    error.value = result.message;
    return;
  }
  if (result.data === null) {
    unavailable.value = true;
    return;
  }
  profile.value = result.data;
});
</script>

<template>
  <main class="mx-auto min-h-full w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
    <header>
      <h1 class="font-medium">{{ t("profile.title") }}</h1>
      <p class="mt-1 text-caption text-muted-foreground">{{ t("profile.subtitle") }}</p>
    </header>

    <section class="mt-8" :aria-busy="loading">
      <p v-if="loading" class="text-caption text-muted-foreground">
        {{ t("profile.loading") }}
      </p>
      <p v-else-if="error" role="alert" class="text-caption text-destructive">
        {{ error }}
      </p>
      <p v-else-if="unavailable" role="alert" class="text-caption text-destructive">
        {{ t("profile.unavailable") }}
      </p>
      <dl
        v-else-if="profile"
        class="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2"
      >
        <div class="bg-card p-5 sm:col-span-2">
          <dt class="text-caption text-muted-foreground">{{ t("profile.fields.email") }}</dt>
          <dd class="mt-1 break-all font-mono">{{ profile.email }}</dd>
        </div>
        <div class="bg-card p-5">
          <dt class="text-caption text-muted-foreground">
            {{ t("profile.fields.dateOfBirth") }}
          </dt>
          <dd class="mt-1">{{ dateOfBirth }}</dd>
        </div>
        <div class="bg-card p-5">
          <dt class="text-caption text-muted-foreground">{{ t("profile.fields.gender") }}</dt>
          <dd class="mt-1">{{ genderLabel(profile.gender) }}</dd>
        </div>
        <div class="bg-card p-5">
          <dt class="text-caption text-muted-foreground">
            {{ t("profile.fields.interestedIn") }}
          </dt>
          <dd class="mt-1">{{ interestedIn }}</dd>
        </div>
        <div class="bg-card p-5">
          <dt class="text-caption text-muted-foreground">{{ t("profile.fields.city") }}</dt>
          <dd class="mt-1">
            {{ t("city.option", { city: profile.city.name, country }) }}
          </dd>
        </div>
      </dl>
    </section>
  </main>
</template>
