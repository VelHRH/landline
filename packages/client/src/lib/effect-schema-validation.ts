import * as Schema from "effect/Schema";
import type { GenericObject, TypedSchema } from "vee-validate";

export const toVeeValidationSchema = <Values extends GenericObject>(
  schema: Schema.Schema.AnyNoContext,
  messageForPath: (path: string | undefined) => string,
): TypedSchema<Values, Values> => {
  const standardSchema = Schema.standardSchemaV1(schema);

  return {
    __type: "VVTypedSchema",
    async parse(values) {
      const result = await standardSchema["~standard"].validate(values);

      if (!result.issues) {
        return { value: values, errors: [] };
      }

      const errors = new Map<string | undefined, string[]>();

      for (const issue of result.issues) {
        const path = issue.path
          ?.map((segment) => String(typeof segment === "object" ? segment.key : segment))
          .join(".");
        errors.set(path, [...(errors.get(path) ?? []), messageForPath(path)]);
      }

      return {
        errors: Array.from(errors, ([path, messages]) => ({ path, errors: messages })),
      };
    },
  };
};
