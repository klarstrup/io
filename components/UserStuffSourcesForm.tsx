"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactElement, useEffect, useId, useMemo, useState } from "react";
import {
  useFieldArray,
  UseFieldArrayUpdate,
  useForm,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import Select, { components, OnChangeValue } from "react-select";
import { v4 as uuid } from "uuid";
import { updateUserDataSources } from "../app/diary/actions";
import { TopLoggerAuthTokens } from "../lib";
import {
  DataSource,
  UserDataSource,
  UserDataSourceMeta,
} from "../sources/utils";
import { DistanceToNowStrict } from "./DistanceToNowStrict";
import { FieldSetY } from "./FieldSet";
import { UserStuffGeohashInput } from "./UserStuffGeohashInput";
import { useApolloClient } from "@apollo/client/react";

function UserStuffSourceForm({
  sourceOptions,
  source,
  index,
  register,
  watch,
  update,
}: {
  sourceOptions: DataSource[];
  source: UserDataSource;
  index: number;
  register: UseFormRegister<{ dataSources: UserDataSource[] }>;
  watch: UseFormWatch<{ dataSources: UserDataSource[] }>;
  update: UseFieldArrayUpdate<{ dataSources: UserDataSource[] }, "dataSources">;
}) {
  let formElements: Element | ReactElement | null = null;

  if (!sourceOptions.includes(source.source)) return null;

  const dataSource = source.source;
  switch (dataSource) {
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
              {...register(`dataSources.${index}.config.graphQLId`, {
                required: true,
              })}
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
        <>
          <label className="flex gap-1">
            iCal URL:{" "}
            <input
              type="text"
              {...register(`dataSources.${index}.config.url`)}
              placeholder="URL"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            Start Date (optional):{" "}
            <input
              type="datetime-local"
              {...register(`dataSources.${index}.config.startDate`, {
                valueAsDate: true,
              })}
              placeholder="Start Date"
              className="flex-1"
            />
          </label>
        </>
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
    case DataSource.MoonBoard:
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
    case DataSource.Crimpd:
      formElements = (
        <label className="flex gap-1">
          Token:{" "}
          <input
            type="text"
            {...register(`dataSources.${index}.config.token`)}
            placeholder="Token"
            className="flex-1"
          />
        </label>
      );
      break;
    case DataSource.ClimbAlong:
      formElements = (
        <>
          <label className="flex gap-1">
            Token:{" "}
            <input
              type="text"
              {...register(`dataSources.${index}.config.token`)}
              placeholder="Token"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            User ID:{" "}
            <input
              type="text"
              {...register(`dataSources.${index}.config.userId`)}
              placeholder="User ID"
              className="flex-1"
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
    case DataSource.Onsight:
      formElements = (
        <>
          <label className="flex gap-1">
            Token:{" "}
            <input
              type="text"
              {...register(`dataSources.${index}.config.token`)}
              placeholder="Token"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            Username (Email):{" "}
            <input
              type="text"
              {...register(`dataSources.${index}.config.username`)}
              placeholder="Username (Email)"
              className="flex-1"
            />
          </label>
        </>
      );
      break;
    case DataSource.Sportstiming:
      formElements = (
        <label className="flex gap-1">
          Name:
          <input
            type="text"
            {...register(`dataSources.${index}.config.name`, {
              required: true,
            })}
            placeholder="Name"
            className="flex-1"
          />
        </label>
      );
      break;
    case DataSource.Songkick:
      formElements = (
        <label className="flex gap-1">
          Artist ID:
          <input
            type="number"
            {...register(`dataSources.${index}.config.artistId`, {
              required: true,
              valueAsNumber: true,
            })}
            placeholder="Artist ID"
            className="flex-1"
          />
        </label>
      );
      break;
    case DataSource.Withings:
      formElements = (
        <label className="flex gap-1">
          Access Token Response:
          <code>
            {JSON.stringify(source.config.accessTokenResponse, null, 2)}
          </code>
        </label>
      );
      break;
    default:
      return dataSource satisfies never;
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
          <label>
            <input
              type="checkbox"
              {...register(`dataSources.${index}.paused`)}
            />{" "}
            Paused
          </label>
        </div>
      }
      className="flex flex-col items-stretch gap-1"
    >
      {formElements}
    </FieldSetY>
  );
}

export default function UserStuffSourcesForm({
  sourceOptions,
  isInsideSmallPopover,
}: {
  sourceOptions: DataSource[];
  isInsideSmallPopover?: boolean;
}) {
  const { data: sessionData } = useSession();
  const user = sessionData?.user;
  const router = useRouter();
  const client = useApolloClient()
  const [isEditing, setIsEditing] = useState(false);

  const defaultValues = useMemo(
    () => ({ dataSources: user?.dataSources ?? [] }),
    [user],
  );
  const {
    handleSubmit,
    register,
    reset,
    control,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm({ defaultValues });
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const {
    fields: sources,
    update,
    append,
  } = useFieldArray({
    control,
    name: "dataSources",
    keyName: "key",
  });

  const instanceId = useId();

  if (!isEditing) {
    return (
      <div className="flex flex-col items-stretch gap-2">
        {!isInsideSmallPopover ? (
          <button
            type="button"
            className={
              sourceOptions.length > 1
                ? "rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 hover:text-white"
                : // Smaller button for single source for compact UI
                  "rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 hover:text-white"
            }
            onClick={() => setIsEditing(true)}
          >
            Edit Data Sources
          </button>
        ) : (
          <span>Data Sources</span>
        )}
        {user?.dataSources && user.dataSources.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-1">
            {user.dataSources.map((source) => {
              const wasFetchedRecently = Boolean(
                source.lastAttemptedAt &&
                new Date(source.lastAttemptedAt) >
                  new Date(Date.now() - 1000 * 60 * 5),
              );

              if (!sourceOptions.includes(source.source)) {
                return null;
              }

              return (
                <div
                  key={source.id}
                  className="flex items-start gap-1 rounded-md border border-gray-300 bg-white/75 p-1"
                >
                  <div className="flex flex-1 flex-col items-stretch">
                    <div className="flex flex-1 flex-wrap gap-1">
                      {source.name !== source.source ? (
                        <small>{source.source}</small>
                      ) : null}
                      <div className="text-sm font-semibold">{source.name}</div>
                    </div>

                    <div className="text-md">
                      {source.paused ||
                      source.source === DataSource.Fitocracy ? (
                        <>
                          <small>Paused</small>{" "}
                          <span title="This data source is paused and will not be automatically fetched.">
                            ⏸️
                          </span>
                        </>
                      ) : source.lastAttemptedAt &&
                        (!source.lastSuccessfulAt ||
                          new Date(source.lastAttemptedAt) >
                            new Date(source.lastSuccessfulAt)) &&
                        (!source.lastFailedAt ||
                          new Date(source.lastAttemptedAt) >
                            new Date(source.lastFailedAt)) ? (
                        <>
                          <small>
                            <DistanceToNowStrict
                              date={new Date(source.lastAttemptedAt)}
                            />
                          </small>{" "}
                          <div className="inline-block animate-spin text-lg leading-0">
                            ↻
                          </div>
                        </>
                      ) : source.lastSuccessfulAt &&
                        (!source.lastFailedAt ||
                          new Date(source.lastSuccessfulAt) >
                            new Date(source.lastFailedAt)) ? (
                        <>
                          <small>
                            <DistanceToNowStrict
                              date={new Date(source.lastSuccessfulAt)}
                            />
                          </small>{" "}
                          ✅
                        </>
                      ) : source.lastFailedAt ? (
                        <>
                          <small>
                            <DistanceToNowStrict
                              date={new Date(source.lastFailedAt)}
                            />
                          </small>{" "}
                          <span title={source.lastError || "Unknown error"}>
                            ⚠️
                          </span>
                        </>
                      ) : (
                        "☑️"
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={
                      Boolean(
                        source.lastAttemptedAt &&
                        (!source.lastSuccessfulAt ||
                          new Date(source.lastAttemptedAt) >
                            new Date(source.lastSuccessfulAt)) &&
                        (!source.lastFailedAt ||
                          new Date(source.lastAttemptedAt) >
                            new Date(source.lastFailedAt)),
                      ) ||
                      wasFetchedRecently ||
                      source.paused ||
                      source.source === DataSource.Fitocracy
                    }
                    className="cursor-pointer text-4xl disabled:cursor-not-allowed disabled:opacity-50"
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    onClick={async () => {
                      const promise = fetch(`/api/${source.source}_scrape`);
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                      router.refresh();
                      await promise;
                      router.refresh();
                    }}
                  >
                    🔄
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      <form
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSubmit={handleSubmit(async (data) => {
          if (!user) {
            // Log-in gate here
            return;
          }

          const sources = data.dataSources;
          console.info({ sources });
          const newSources = await updateUserDataSources(user.id, sources);
          console.info({ newSources });

          reset(
            newSources
              ? { dataSources: newSources }
              : { dataSources: user.dataSources },
          );
          setIsEditing(false);
          router.refresh();
          client.refetchQueries({ include: "all" });
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
            Update Data Sources
          </button>
          <button
            type="button"
            className="rounded-md bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-400"
            onClick={() => {
              reset();
              setIsEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {sources.map(({ key, ...source }, index) => (
            <UserStuffSourceForm
              key={key}
              sourceOptions={sourceOptions}
              source={source}
              index={index}
              register={register}
              watch={watch}
              update={update}
            />
          ))}
          <Select
            components={{
              Input: (props) => (
                <components.Input
                  {...props}
                  aria-activedescendant={undefined}
                />
              ),
            }}
            instanceId={instanceId}
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

              const value = selected.value;
              const initialSourceMeta: UserDataSourceMeta = {
                id: uuid(),
                name: value,
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

              switch (value) {
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
                    config: { url: "", startDate: undefined },
                  });
                  break;
                case DataSource.KilterBoard:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.KilterBoard,
                    config: { token: "", user_id: "" },
                  });
                  break;
                case DataSource.MoonBoard:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.MoonBoard,
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
                case DataSource.Crimpd:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.Crimpd,
                    config: { token: "" },
                  });
                  break;
                case DataSource.ClimbAlong:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.ClimbAlong,
                    config: { token: "", userId: "" },
                  });
                  break;
                case DataSource.Tomorrow:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.Tomorrow,
                    config: { geohash: "" },
                  });
                  break;
                case DataSource.Onsight:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.Onsight,
                    config: { token: "", username: "" },
                  });
                  break;
                case DataSource.Sportstiming:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.Sportstiming,
                    config: { name: "" },
                  });
                  break;
                case DataSource.Songkick:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.Songkick,
                    config: { artistId: NaN },
                  });
                  break;
                case DataSource.Withings:
                  append({
                    ...initialSourceMeta,
                    source: DataSource.Withings,
                    config: {
                      accessTokenResponse: {
                        userid: "",
                        access_token: "",
                        refresh_token: "",
                        expires_in: 0,
                        scope: "",
                        csrf_token: "",
                        token_type: "",
                      },
                    },
                  });
                  break;

                default:
                  return value satisfies never;
              }
            }}
          />
        </div>
      </form>
    </div>
  );
}
