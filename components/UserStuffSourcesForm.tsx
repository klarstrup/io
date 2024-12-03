"use client";
import { Session } from "next-auth";
import { ReactElement, useId } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import Select, { components, OnChangeValue } from "react-select";
import { v4 as uuid } from "uuid";
import { updateUserDataSources } from "../app/diary/actions";
import { TopLoggerAuthTokens } from "../lib";
import { DataSource, UserDataSourceMeta } from "../sources/utils";
import { FieldSetY } from "./FieldSet";
import { omit } from "../utils";

export default function UserStuffSourcesForm({
  user,
}: {
  user: Session["user"];
}) {
  const {
    handleSubmit,
    register,
    reset,
    control,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm({
    defaultValues: { dataSources: user?.dataSources ?? [] },
  });

  const {
    fields: sources,
    update,
    append,
  } = useFieldArray({
    control,
    name: "dataSources",
    keyName: "key",
  });

  return (
    <div className="flex flex-wrap gap-1">
      <form
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSubmit={handleSubmit(async (data) => {
          const sources = data.dataSources;
          console.info({ sources });
          const newSources = await updateUserDataSources(user.id, sources);
          console.info({ newSources });

          reset(
            newSources
              ? { dataSources: newSources }
              : { dataSources: user.dataSources },
          );
        })}
        className="flex min-w-[50%] flex-1 flex-col gap-1"
      >
        <div className="flex items-center justify-evenly">
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className={
              "rounded-md px-4 py-2 text-sm font-semibold " +
              (isDirty
                ? "bg-blue-600 text-white"
                : "bg-gray-300 text-gray-600") +
              " hover:bg-blue-700 hover:text-white" +
              (isSubmitting ? " cursor-not-allowed" : "") +
              (isDirty ? " cursor-pointer" : "") +
              (isSubmitting ? " opacity-50" : "")
            }
          >
            Update
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {sources.map(({ key, ...source }, index) => {
            let formElements: Element | ReactElement | null = null;

            switch (source.source) {
              case DataSource.Fitocracy:
                formElements = (
                  <>
                    <input
                      type="number"
                      {...register(`dataSources.${index}.config.userId`, {
                        required: true,
                        valueAsNumber: true,
                      })}
                      placeholder="User ID"
                    />
                  </>
                );
                break;
              case DataSource.MyFitnessPal:
                formElements = (
                  <>
                    <input
                      type="text"
                      {...register(`dataSources.${index}.config.token`, {
                        required: true,
                      })}
                      placeholder="Token"
                    />
                    <input
                      type="text"
                      {...register(`dataSources.${index}.config.userName`, {
                        required: true,
                      })}
                      placeholder="User Name"
                    />
                    <input
                      type="text"
                      {...register(`dataSources.${index}.config.userId`, {
                        required: true,
                      })}
                      placeholder="User ID"
                    />
                  </>
                );
                break;
              case DataSource.RunDouble:
                formElements = (
                  <>
                    <input
                      type="text"
                      {...register(`dataSources.${index}.config.id`, {
                        required: true,
                      })}
                      placeholder="ID"
                    />
                  </>
                );
                break;
              case DataSource.TopLogger:
                formElements = (
                  <>
                    <input
                      type="number"
                      {...register(`dataSources.${index}.config.id`, {
                        required: true,
                      })}
                      placeholder="ID"
                    />
                    <input
                      type="text"
                      {...register(`dataSources.${index}.config.graphQLId`, {
                        required: true,
                      })}
                      placeholder="GraphQL ID"
                    />
                    <input
                      type="text"
                      value={JSON.stringify(
                        watch(`dataSources.${index}.config.authTokens`),
                      )}
                      onChange={(e) => {
                        const value = e.target.value;
                        const authTokens = JSON.parse(
                          value,
                        ) as unknown as TopLoggerAuthTokens;

                        update(index, {
                          ...source,
                          config: {
                            ...source.config,
                            authTokens,
                          },
                        });
                      }}
                      className="flex-1 border-b-2 border-gray-200 focus:border-gray-500"
                    />
                  </>
                );
                break;
              case DataSource.ICal:
                formElements = (
                  <>
                    <input
                      type="text"
                      {...register(`dataSources.${index}.config.url`)}
                      placeholder="URL"
                    />
                  </>
                );
                break;
            }

            return (
              <FieldSetY
                legend={
                  <>
                    {source.source}:{" "}
                    <input
                      type="text"
                      {...register(`dataSources.${index}.name`)}
                    />
                  </>
                }
                key={key}
                className="flex flex-col items-stretch gap-1"
              >
                {formElements}
                <pre className="text-xs">
                  {JSON.stringify(
                    omit(source, "id", "config", "name", "source"),
                    null,
                    2,
                  )}
                </pre>
              </FieldSetY>
            );
          })}
          <Select
            components={{
              Input: (props) => (
                <components.Input
                  {...props}
                  aria-activedescendant={undefined}
                />
              ),
            }}
            instanceId={useId()}
            isDisabled={isSubmitting}
            placeholder="Add data source..."
            options={Object.values(DataSource).map((source) => ({
              label: source,
              value: source,
            }))}
            onChange={(
              selected: OnChangeValue<
                { label: DataSource; value: DataSource },
                false
              >,
            ) => {
              if (!selected) return;

              const initialSourceMeta: UserDataSourceMeta = {
                id: uuid(),
                name: selected.value,
                updatedAt: new Date(),
                createdAt: new Date(),
                lastAttemptedAt: null,
                lastSuccessfulAt: null,
                lastSuccessfulRuntime: null,
                lastResult: null,
                lastFailedAt: null,
                lastFailedRuntime: null,
                lastError: null,
              };

              switch (selected.value) {
                case DataSource.Fitocracy:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.Fitocracy,
                    config: { userId: NaN },
                  });
                  break;
                case DataSource.MyFitnessPal:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.MyFitnessPal,
                    config: { token: "", userName: "", userId: "" },
                  });
                  break;
                case DataSource.RunDouble:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.RunDouble,
                    config: { id: "" },
                  });
                  break;
                case DataSource.TopLogger:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.TopLogger,
                    config: {
                      id: NaN,
                      graphQLId: "",
                      authTokens: {
                        access: {
                          token: "",
                          expiresAt: "",
                          __typename: "AuthToken",
                        },
                        refresh: {
                          token: "",
                          expiresAt: "",
                          __typename: "AuthToken",
                        },
                        __typename: "AuthTokens",
                      },
                    },
                  });
                  break;
                case DataSource.ICal:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.ICal,
                    config: { url: "" },
                  });
                  break;
              }
            }}
          />
        </div>
      </form>
    </div>
  );
}
