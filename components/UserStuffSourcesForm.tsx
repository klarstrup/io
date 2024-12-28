"use client";
import { Session } from "next-auth";
import { ReactElement, useId } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import Select, { components, OnChangeValue } from "react-select";
import { v4 as uuid } from "uuid";
import { updateUserDataSources } from "../app/diary/actions";
import { TopLoggerAuthTokens } from "../lib";
import { DataSource, UserDataSourceMeta } from "../sources/utils";
import { DistanceToNowStrict } from "./DistanceToNowStrict";
import { FieldSetX, FieldSetY } from "./FieldSet";
import { UserStuffGeohashInput } from "./UserStuffGeohashInput";

export default function UserStuffSourcesForm({
  user,
  sourceOptions,
}: {
  user: Session["user"];
  sourceOptions: DataSource[];
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
    <FieldSetX legend="Data Sources" className="w-full">
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

              if (!sourceOptions.includes(source.source)) {
                return null;
              }

              switch (source.source) {
                case DataSource.Fitocracy:
                  formElements = (
                    <label className="flex gap-1">
                      User ID:
                      <input
                        type="number"
                        {...register(`dataSources.${index}.config.userId`, {
                          required: true,
                          valueAsNumber: true,
                        })}
                        placeholder="User ID"
                        className="flex-1"
                      />
                    </label>
                  );
                  break;
                case DataSource.MyFitnessPal:
                  formElements = (
                    <>
                      <label className="flex gap-1">
                        Token:
                        <input
                          type="text"
                          {...register(`dataSources.${index}.config.token`, {
                            required: true,
                          })}
                          placeholder="Token"
                          className="flex-1"
                        />
                      </label>
                      <label className="flex gap-1">
                        Username:
                        <input
                          type="text"
                          {...register(`dataSources.${index}.config.userName`, {
                            required: true,
                          })}
                          placeholder="User Name"
                          className="flex-1"
                        />
                      </label>
                      <label className="flex gap-1">
                        User ID:
                        <input
                          type="text"
                          {...register(`dataSources.${index}.config.userId`, {
                            required: true,
                          })}
                          placeholder="User ID"
                          className="flex-1"
                        />
                      </label>
                    </>
                  );
                  break;
                case DataSource.RunDouble:
                  formElements = (
                    <label className="flex gap-1">
                      ID:
                      <input
                        type="text"
                        {...register(`dataSources.${index}.config.id`, {
                          required: true,
                        })}
                        placeholder="ID"
                        className="flex-1"
                      />
                    </label>
                  );
                  break;
                case DataSource.TopLogger:
                  formElements = (
                    <>
                      <label className="flex gap-1">
                        ID:
                        <input
                          type="number"
                          {...register(`dataSources.${index}.config.id`, {
                            required: true,
                          })}
                          placeholder="ID"
                          className="flex-1"
                        />
                      </label>
                      <label className="flex gap-1">
                        GraphQL ID:
                        <input
                          type="text"
                          {...register(
                            `dataSources.${index}.config.graphQLId`,
                            {
                              required: true,
                            },
                          )}
                          placeholder="GraphQL ID"
                          className="flex-1"
                        />
                      </label>
                      <label className="flex gap-1">
                        Auth Tokens:
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
                              config: { ...source.config, authTokens },
                            });
                          }}
                          className="flex-1 font-mono"
                        />
                      </label>
                    </>
                  );
                  break;
                case DataSource.ICal:
                  formElements = (
                    <label className="flex gap-1">
                      iCal URL:{" "}
                      <input
                        type="text"
                        {...register(`dataSources.${index}.config.url`)}
                        placeholder="URL"
                        className="flex-1"
                      />
                    </label>
                  );
                  break;
                case DataSource.KilterBoard:
                  formElements = (
                    <>
                      <label className="flex gap-1">
                        Token:
                        <input
                          type="text"
                          {...register(`dataSources.${index}.config.token`, {
                            required: true,
                          })}
                          placeholder="Token"
                          className="flex-1"
                        />
                      </label>
                      <label className="flex gap-1">
                        User ID:
                        <input
                          type="text"
                          {...register(`dataSources.${index}.config.user_id`, {
                            required: true,
                          })}
                          placeholder="User ID"
                          className="flex-1"
                        />
                      </label>
                    </>
                  );
                  break;
                case DataSource.Grippy:
                  formElements = (
                    <>
                      <label className="flex gap-1">
                        Auth Tokens:
                        <input
                          type="text"
                          value={JSON.stringify(
                            watch(`dataSources.${index}.config.authTokens`),
                          )}
                          onChange={(e) => {
                            const value = e.target.value;
                            const authTokens = JSON.parse(
                              value,
                            ) as unknown as typeof source.config.authTokens;

                            update(index, {
                              ...source,
                              config: { ...source.config, authTokens },
                            });
                          }}
                          className="flex-1 font-mono"
                        />
                      </label>
                    </>
                  );
                  break;
                case DataSource.Tomorrow:
                  formElements = (
                    <label className="flex gap-1">
                      Geohash:{" "}
                      <UserStuffGeohashInput
                        geohash={source.config.geohash}
                        onGeohashChange={(geohash) =>
                          update(index, {
                            ...source,
                            config: { ...source.config, geohash },
                          })
                        }
                      />
                    </label>
                  );
                  break;
              }

              return (
                <FieldSetY
                  legend={
                    <div className="flex gap-1 text-sm">
                      {source.source}:{" "}
                      <input
                        type="text"
                        {...register(`dataSources.${index}.name`)}
                        placeholder="Name"
                        className="flex-1"
                      />
                    </div>
                  }
                  key={key}
                  className="flex flex-col items-stretch gap-1"
                >
                  {formElements}
                  {source.source !== DataSource.Fitocracy ? ( // Fitocracy is read-only
                    <div className="text-xs">
                      {source.lastAttemptedAt &&
                      (!source.lastSuccessfulAt ||
                        source.lastAttemptedAt > source.lastSuccessfulAt) &&
                      (!source.lastFailedAt ||
                        source.lastAttemptedAt > source.lastFailedAt) ? (
                        <>
                          Started{" "}
                          <DistanceToNowStrict date={source.lastAttemptedAt} />{" "}
                          <div className="inline-block animate-spin">↻</div>
                        </>
                      ) : source.lastSuccessfulAt &&
                        (!source.lastFailedAt ||
                          source.lastSuccessfulAt > source.lastFailedAt) ? (
                        <>
                          Last successful fetch{" "}
                          <DistanceToNowStrict date={source.lastSuccessfulAt} />{" "}
                          {source.lastSuccessfulRuntime ? (
                            <>
                              in{" "}
                              {(source.lastSuccessfulRuntime / 1000)?.toFixed(
                                2,
                              )}
                              s
                            </>
                          ) : null}
                        </>
                      ) : source.lastFailedAt ? (
                        <>
                          Last failed fetch{" "}
                          <DistanceToNowStrict date={source.lastFailedAt} />{" "}
                          {source.lastFailedRuntime ? (
                            <>
                              in {(source.lastFailedRuntime / 1000)?.toFixed(2)}
                              s
                            </>
                          ) : null}
                          <div className="text-red-600">
                            {source.lastError ?? "Unknown error"}
                          </div>
                        </>
                      ) : (
                        "Never fetched"
                      )}
                    </div>
                  ) : null}
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
              options={sourceOptions.map((source) => ({
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
                  case DataSource.KilterBoard:
                    append({
                      ...initialSourceMeta,
                      source: DataSource.KilterBoard,
                      config: { token: "", user_id: "" },
                    });
                    break;
                  case DataSource.Grippy:
                    append({
                      ...initialSourceMeta,
                      source: DataSource.Grippy,
                      config: {
                        authTokens: {
                          access_token: "",
                          expires_in: NaN,
                          token_type: "",
                          scope: "",
                          refresh_token: "",
                        },
                      },
                    });
                    break;
                  case DataSource.Tomorrow:
                    append({
                      ...initialSourceMeta,
                      source: DataSource.Tomorrow,
                      config: { geohash: "" },
                    });
                    break;
                }
              }}
            />
          </div>
        </form>
      </div>
    </FieldSetX>
  );
}
