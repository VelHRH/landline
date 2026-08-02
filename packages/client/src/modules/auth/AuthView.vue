<script setup lang="ts">
import { Gender } from "@landline/domain/user/enums";
import { computed, ref } from "vue";
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
  <main class="flex min-h-dvh items-center justify-center px-6 py-16">
    <form class="w-full max-w-sm" novalidate @submit="submit">
      <LandlineWordmark class="mb-10 w-40" />
      <h1 class="font-medium">
        {{ mode === AuthMode.Login ? t("auth.login.title") : t("auth.signup.title") }}
      </h1>
      <p class="mt-2 text-caption text-muted-foreground">
        {{ mode === AuthMode.Login ? t("auth.login.subtitle") : t("auth.signup.subtitle") }}
      </p>

      <div class="mt-10 space-y-5">
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
  </main>
</template>
