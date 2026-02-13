"use client";
import { useApolloClient } from "@apollo/client/react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { updateUserDataSource } from "../app/diary/actions";
import type { TopLoggerAuthTokens } from "../lib";
import { DataSource, type UserDataSource } from "../sources/utils";
import { DistanceToNowStrict } from "./DistanceToNowStrict";
import { FieldSetY } from "./FieldSet";
import { UserStuffGeohashInput } from "./UserStuffGeohashInput";

function UserStuffSourceForm({
  sourceOptions,
  source,
}: {
  sourceOptions: DataSource[];
  source: UserDataSource;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: sessionData } = useSession();
  const user = sessionData?.user;
  const router = useRouter();
  const client = useApolloClient();

  const defaultValues = useMemo(() => source, [source]);
  const {
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<UserDataSource>({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  let formElements: Element | ReactElement | null = null;

  if (!sourceOptions.includes(source.source)) return null;

  if (!isEditing) {
    const wasFetchedRecently = Boolean(
      source.lastAttemptedAt &&
      new Date(source.lastAttemptedAt) > new Date(Date.now() - 1000 * 60 * 5),
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
            <button
              type="button"
              className="cursor-pointer text-sm"
              onClick={() => setIsEditing(true)}
            >
              ✏️
            </button>
            {source.name !== source.source ? (
              <small>{source.source}</small>
            ) : null}
            <div className="text-sm font-semibold">{source.name}</div>
          </div>

          <div className="text-md">
            {source.paused || source.source === DataSource.Fitocracy ? (
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
                  <DistanceToNowStrict date={new Date(source.lastFailedAt)} />
                </small>{" "}
                <span title={source.lastError || "Unknown error"}>⚠️</span>
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
            client.refetchQueries({ include: "all" });
          }}
        >
          🔄
        </button>
      </div>
    );
  }

  const dataSource = source.source;
  switch (dataSource) {
    case DataSource.Fitocracy:
      formElements = (
        <label className="flex gap-1">
          User ID:
          <input
            type="number"
            {...register("config.userId", {
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
              {...register("config.token", { required: true })}
              placeholder="Token"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            Username:
            <input
              type="text"
              {...register("config.userName", { required: true })}
              placeholder="User Name"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            User ID:
            <input
              type="text"
              {...register("config.userId", { required: true })}
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
            {...register("config.id", { required: true })}
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
              {...register("config.id", { required: true })}
              placeholder="ID"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            GraphQL ID:
            <input
              type="text"
              {...register("config.graphQLId", { required: true })}
              placeholder="GraphQL ID"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            Auth Tokens:
            <input
              type="text"
              value={JSON.stringify(watch("config.authTokens"))}
              onChange={(e) => {
                const value = e.target.value;
                const authTokens = JSON.parse(
                  value,
                ) as unknown as TopLoggerAuthTokens;

                setValue("config.authTokens", authTokens, {
                  shouldDirty: true,
                  shouldValidate: true,
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
              {...register("config.url")}
              placeholder="URL"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            Start Date (optional):{" "}
            <input
              type="datetime-local"
              {...register("config.startDate", { valueAsDate: true })}
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
              {...register("config.token", { required: true })}
              placeholder="Token"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            User ID:
            <input
              type="text"
              {...register("config.user_id", { required: true })}
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
              {...register("config.token", { required: true })}
              placeholder="Token"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            User ID:
            <input
              type="text"
              {...register("config.user_id", { required: true })}
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
              value={JSON.stringify(watch("config.authTokens"))}
              onChange={(e) => {
                const value = e.target.value;
                const authTokens = JSON.parse(
                  value,
                ) as unknown as typeof source.config.authTokens;

                setValue("config.authTokens", authTokens, {
                  shouldDirty: true,
                  shouldValidate: true,
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
            {...register("config.token")}
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
              {...register("config.token")}
              placeholder="Token"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            User ID:{" "}
            <input
              type="text"
              {...register("config.userId")}
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
            onGeohashChange={(geohash) => {
              setValue("config.geohash", geohash, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
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
              {...register("config.token")}
              placeholder="Token"
              className="flex-1"
            />
          </label>
          <label className="flex gap-1">
            Username (Email):{" "}
            <input
              type="text"
              {...register("config.username")}
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
            {...register("config.name", {
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
            {...register("config.artistId", {
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
    <form
      onSubmit={handleSubmit(async (newDataSource) => {
        if (!user) return;

        const updatedSource = await updateUserDataSource(
          user.id,
          source.id,
          newDataSource,
        );

        reset(updatedSource);
        setIsEditing(false);
        router.refresh();
        client.refetchQueries({ include: "all" });
      })}
      className="flex w-full flex-col items-stretch gap-1"
    >
      <FieldSetY
        legend={
          <div className="flex gap-1 text-sm">
            <button
              type="button"
              className="cursor-pointer text-sm"
              onClick={() => setIsEditing(false)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            {source.source}:{" "}
            <input
              type="text"
              {...register("name")}
              placeholder="Name"
              className="flex-1"
            />
          </div>
        }
        className="flex w-full flex-col items-stretch gap-1"
      >
        <label>
          <input type="checkbox" {...register("paused")} /> Paused
        </label>
        {formElements}
        <button
          type="submit"
          disabled={isSubmitting}
          className={
            "rounded-md px-4 py-2 text-sm font-semibold " +
            (isDirty ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600") +
            " hover:bg-blue-700 hover:text-white" +
            (isSubmitting ? " cursor-not-allowed" : "") +
            (isDirty ? " cursor-pointer" : "") +
            (isSubmitting ? " opacity-50" : "")
          }
        >
          💾
        </button>
      </FieldSetY>
    </form>
  );
}

export default function UserStuffSourcesForm({
  sourceOptions,
}: {
  sourceOptions: DataSource[];
}) {
  const { data: sessionData } = useSession();
  const user = sessionData?.user;

  return (
    <div className="flex flex-col items-stretch gap-2">
      <span>Data Sources</span>
      {user?.dataSources && user.dataSources.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-1">
          {user.dataSources.map((source) => (
            <UserStuffSourceForm
              key={source.id}
              sourceOptions={sourceOptions}
              source={source}
            />
          ))}
        </div>
      ) : null}
    </div>
  );

  /* 


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
          const newSources = await updateUserDataSource(user.id, sources);
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
            }}
          >
            Cancel
          </button>
        </div>
        <div className="flex flex-col gap-1">
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
  */
}
