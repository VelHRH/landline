<script setup lang="ts">
import { Gender } from "@landline/domain/user/enums";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useForm } from "vee-validate";
import { RouteName, routeName } from "@/router";
import CityTypeahead from "@/modules/city/CityTypeahead.vue";
import {
  credentialsValidationSchema,
  signUpValidationSchema,
  type AuthFormValues,
} from "./auth.service";
import { useSessionStore } from "./session.store";
import Button from "@/ui/button/Button.vue";
import { ButtonVariant } from "@/ui/button/button-variant";
import Input from "@/ui/Input.vue";
import LandlineWordmark from "@/ui/LandlineWordmark.vue";

enum AuthMode {
  Login = "login",
  Signup = "signup",
}

const session = useSessionStore();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const phraseKeys = [
  "auth.phrases.cover",
  "auth.phrases.hello",
  "auth.phrases.person",
  "auth.phrases.weekend",
] as const;
const phraseIndex = ref(0);
let phraseInterval: ReturnType<typeof window.setInterval> | undefined;
let reducedMotionQuery: MediaQueryList | undefined;

const stopPhraseRotation = () => {
  if (phraseInterval !== undefined) {
    window.clearInterval(phraseInterval);
    phraseInterval = undefined;
  }
};

const updatePhraseRotation = () => {
  stopPhraseRotation();
  phraseIndex.value = 0;

  if (!reducedMotionQuery?.matches) {
    phraseInterval = window.setInterval(() => {
      phraseIndex.value = (phraseIndex.value + 1) % phraseKeys.length;
    }, 5000);
  }
};

onMounted(() => {
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotionQuery.addEventListener("change", updatePhraseRotation);
  updatePhraseRotation();
});

onUnmounted(() => {
  stopPhraseRotation();
  reducedMotionQuery?.removeEventListener("change", updatePhraseRotation);
});

const genderOptions = computed<ReadonlyArray<{ value: Gender; label: string }>>(() => [
  { value: Gender.FEMALE, label: t("gender.female") },
  { value: Gender.MALE, label: t("gender.male") },
  { value: Gender.NONBINARY, label: t("gender.nonbinary") },
]);

const mode = ref<AuthMode>(AuthMode.Login);
const validationSchema = computed(() =>
  mode.value === AuthMode.Login ? credentialsValidationSchema : signUpValidationSchema,
);

const { defineField, errors, handleSubmit, isSubmitting, resetForm, values } =
  useForm<AuthFormValues>({
    initialValues: {
      email: "",
      password: "",
      dateOfBirth: "",
      gender: "",
      interestedIn: [],
      cityId: null,
    },
    validationSchema,
  });

const [email] = defineField("email");
const [password] = defineField("password");
const [dateOfBirth] = defineField("dateOfBirth");
const [gender] = defineField("gender");
const [interestedIn] = defineField("interestedIn");
const [cityId] = defineField("cityId");
const submitError = ref<string | null>(null);

const toggleMode = () => {
  mode.value = mode.value === AuthMode.Login ? AuthMode.Signup : AuthMode.Login;
  submitError.value = null;
  resetForm({ values: { ...values } });
};

const toggleInterested = (value: Gender) => {
  interestedIn.value = interestedIn.value.includes(value)
    ? interestedIn.value.filter((entry) => entry !== value)
    : [...interestedIn.value, value];
};

const submit = handleSubmit(async (formValues) => {
  submitError.value = null;
  const result =
    mode.value === AuthMode.Login
      ? await session.login(formValues.email, formValues.password)
      : await session.signUp({
          email: formValues.email,
          password: formValues.password,
          dateOfBirth: formValues.dateOfBirth,
          gender: formValues.gender as Gender,
          interestedIn: formValues.interestedIn,
          cityId: formValues.cityId as string,
        });

  if (result.ok) {
    const redirect = route.query.redirect;
    await router.replace(
      typeof redirect === "string" ? redirect : { name: routeName(RouteName.CHATS) },
    );
  } else {
    submitError.value = result.message;
  }
});
</script>

<template>
  <main class="relative min-h-dvh overflow-hidden bg-background px-6 py-10 sm:px-10 lg:px-14">
    <div
      class="relative mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:gap-16"
    >
      <section
        class="relative isolate flex flex-col items-center text-center lg:items-start lg:text-left"
      >
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-56 max-w-xl opacity-20 sm:h-72 lg:inset-x-auto lg:-left-10 lg:top-1/2 lg:h-[28rem] lg:w-[36rem] lg:-translate-y-1/2 lg:opacity-30"
        >
          <img
            src="/logo/landline-face-left-cyan.svg"
            alt=""
            class="absolute inset-y-0 left-0 h-full w-auto"
          />
          <img
            src="/logo/landline-face-right-pink.svg"
            alt=""
            class="absolute inset-y-0 right-0 h-full w-auto"
          />
        </div>

        <LandlineWordmark class="w-full max-w-72 sm:max-w-md lg:max-w-xl" />

        <p class="sr-only">{{ t(phraseKeys[0]) }}</p>
        <div
          aria-hidden="true"
          class="mt-7 grid h-[5.25rem] w-full max-w-xl place-items-center sm:h-[4.75rem] lg:mt-10 lg:place-items-start"
        >
          <Transition name="auth-phrase" mode="out-in">
            <p
              :key="phraseKeys[phraseIndex]"
              class="col-start-1 row-start-1 max-w-lg text-h2 font-medium text-foreground sm:text-h1"
            >
              {{ t(phraseKeys[phraseIndex]) }}
            </p>
          </Transition>
        </div>
      </section>

      <form
        class="w-full rounded-md border border-border bg-card p-6 shadow-md sm:p-8 lg:p-10"
        novalidate
        @submit="submit"
      >
        <h1 class="font-medium">
          {{ mode === AuthMode.Login ? t("auth.login.title") : t("auth.signup.title") }}
        </h1>
        <p class="mt-2 text-caption text-muted-foreground">
          {{ mode === AuthMode.Login ? t("auth.login.subtitle") : t("auth.signup.subtitle") }}
        </p>

        <div class="mt-8 space-y-5">
          <Input
            v-model="email"
            :label="t('auth.fields.email')"
            type="email"
            autocomplete="email"
            required
            :error="errors.email"
          />
          <Input
            v-model="password"
            :label="t('auth.fields.password')"
            type="password"
            :autocomplete="mode === AuthMode.Login ? 'current-password' : 'new-password'"
            required
            :error="errors.password"
          />

          <template v-if="mode === AuthMode.Signup">
            <Input
              v-model="dateOfBirth"
              :label="t('auth.fields.dateOfBirth')"
              type="date"
              autocomplete="bday"
              required
              :error="errors.dateOfBirth"
            />

            <label class="block">
              <span class="mb-2 block text-caption text-muted-foreground">
                {{ t("auth.fields.gender") }}
              </span>
              <select
                v-model="gender"
                required
                :aria-invalid="errors.gender ? 'true' : undefined"
                class="w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="" disabled>{{ t("auth.select") }}</option>
                <option v-for="option in genderOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <span v-if="errors.gender" class="mt-2 block text-caption text-destructive">
                {{ errors.gender }}
              </span>
            </label>

            <fieldset>
              <legend class="mb-2 block text-caption text-muted-foreground">
                {{ t("auth.fields.interestedIn") }}
              </legend>
              <div class="flex flex-wrap gap-4">
                <label
                  v-for="option in genderOptions"
                  :key="option.value"
                  class="flex items-center gap-2 text-foreground"
                >
                  <input
                    type="checkbox"
                    :checked="interestedIn.includes(option.value)"
                    class="rounded border-input text-primary focus:ring-2 focus:ring-ring/40"
                    @change="toggleInterested(option.value)"
                  />
                  {{ option.label }}
                </label>
              </div>
              <p v-if="errors.interestedIn" class="mt-2 text-caption text-destructive">
                {{ errors.interestedIn }}
              </p>
            </fieldset>

            <CityTypeahead v-model="cityId" />
            <p v-if="errors.cityId" class="-mt-3 text-caption text-destructive">
              {{ errors.cityId }}
            </p>
          </template>
        </div>

        <p v-if="submitError" role="alert" class="mt-4 text-caption text-destructive">
          {{ submitError }}
        </p>

        <Button type="submit" :loading="isSubmitting" class="mt-8 w-full">
          {{ mode === AuthMode.Login ? t("auth.login.submit") : t("auth.signup.submit") }}
        </Button>

        <Button
          type="button"
          :variant="ButtonVariant.LINK"
          class="mt-6 block w-full text-center"
          @click="toggleMode"
        >
          {{ mode === AuthMode.Login ? t("auth.login.toggle") : t("auth.signup.toggle") }}
        </Button>
      </form>
    </div>
  </main>
</template>

<style scoped>
.auth-phrase-enter-active,
.auth-phrase-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.auth-phrase-enter-from {
  opacity: 0;
  transform: translateY(0.25rem);
}

.auth-phrase-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}

@media (prefers-reduced-motion: reduce) {
  .auth-phrase-enter-active,
  .auth-phrase-leave-active {
    transition: none;
  }
}
</style>
