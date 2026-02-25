"use client";
import { useApolloClient } from "@apollo/client/react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import Select, { components, OnChangeValue } from "react-select";
import {
  createUserDataSource,
  updateUserDataSource,
} from "../app/diary/actions";
import type { TopLoggerAuthTokens } from "../lib";
import {
  DataSource,
  UserDataSourceMeta,
  type UserDataSource,
} from "../sources/utils";
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
  const { data: sessionData, update } = useSession();
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
        className="flex items-start justify-between gap-1 rounded-md border border-gray-300 bg-white/75 p-1"
      >
        <div className="flex items-stretch">
          <div className="flex gap-2">
            <div
              className={
                "flex h-full flex-col items-center justify-between gap-0.5 rounded-md text-sm"
              }
            >
              <button
                type="button"
                className="cursor-pointer text-2xl leading-none"
                onClick={() => setIsEditing(true)}
              >
                ✍️
              </button>
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
                className="cursor-pointer text-2xl disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="flex flex-1 flex-col justify-between leading-snug">
              {source.name !== source.source ? (
                <small>{source.source}</small>
              ) : null}
              <div className="text-sm font-semibold">{source.name}</div>
              <div>
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
                      <DistanceToNowStrict
                        date={new Date(source.lastFailedAt)}
                      />
                    </small>{" "}
                    <span title={source.lastError || "Unknown error"}>⚠️</span>
                  </>
                ) : (
                  "☑️"
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dataSource = source.source;
  switch (dataSource) {
    case DataSource.Fitocracy:
      formElements = (
        <label className="flex flex-col gap-1">
          User ID:
          <input
            type="number"
            {...register("config.userId", {
              required: true,
              valueAsNumber: true,
            })}
            placeholder="User ID"
            className="w-full"
          />
        </label>
      );
      break;
    case DataSource.MyFitnessPal:
      formElements = (
        <>
          <label className="flex flex-col gap-1">
            Token:
            <input
              type="text"
              {...register("config.token", { required: true })}
              placeholder="Token"
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            Username:
            <input
              type="text"
              {...register("config.userName", { required: true })}
              placeholder="User Name"
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            User ID:
            <input
              type="text"
              {...register("config.userId", { required: true })}
              placeholder="User ID"
              className="w-full"
            />
          </label>
        </>
      );
      break;
    case DataSource.RunDouble:
      formElements = (
        <label className="flex flex-col gap-1">
          ID:
          <input
            type="text"
            {...register("config.id", { required: true })}
            placeholder="ID"
            className="w-full"
          />
        </label>
      );
      break;
    case DataSource.TopLogger:
      formElements = (
        <>
          <label className="flex flex-col gap-1">
            ID:
            <input
              type="number"
              {...register("config.id", { required: true })}
              placeholder="ID"
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            GraphQL ID:
            <input
              type="text"
              {...register("config.graphQLId", { required: true })}
              placeholder="GraphQL ID"
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            Auth Tokens:
            <input
              type="text"
              // eslint-disable-next-line react-hooks/incompatible-library
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
              className="w-full font-mono"
            />
          </label>
        </>
      );
      break;
    case DataSource.ICal:
      formElements = (
        <>
          <label className="flex flex-col gap-1">
            iCal URL:{" "}
            <input
              type="text"
              {...register("config.url")}
              placeholder="URL"
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            Start Date (optional):{" "}
            <input
              type="datetime-local"
              {...register("config.startDate", { valueAsDate: true })}
              placeholder="Start Date"
              className="w-full"
            />
          </label>
        </>
      );
      break;
    case DataSource.KilterBoard:
      formElements = (
        <>
          <label className="flex flex-col gap-1">
            Token:
            <input
              type="text"
              {...register("config.token", { required: true })}
              placeholder="Token"
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            User ID:
            <input
              type="text"
              {...register("config.user_id", { required: true })}
              placeholder="User ID"
              className="w-full"
            />
          </label>
        </>
      );
      break;
    case DataSource.MoonBoard:
      formElements = (
        <>
          <label className="flex flex-col gap-1">
            Token:
            <input
              type="text"
              {...register("config.token", { required: true })}
              placeholder="Token"
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            User ID:
            <input
              type="text"
              {...register("config.user_id", { required: true })}
              placeholder="User ID"
              className="w-full"
            />
          </label>
        </>
      );
      break;
    case DataSource.Grippy:
      formElements = (
        <>
          <label className="flex flex-col gap-1">
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
              className="w-full font-mono"
            />
          </label>
        </>
      );
      break;
    case DataSource.Crimpd:
      formElements = (
        <label className="flex flex-col gap-1">
          Token:{" "}
          <input
            type="text"
            {...register("config.token")}
            placeholder="Token"
            className="w-full"
          />
        </label>
      );
      break;
    case DataSource.ClimbAlong:
      formElements = (
        <>
          <label className="flex flex-col gap-1">
            Token:{" "}
            <input
              type="text"
              {...register("config.token")}
              placeholder="Token"
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            User ID:{" "}
            <input
              type="text"
              {...register("config.userId")}
              placeholder="User ID"
              className="w-full"
            />
          </label>
        </>
      );
      break;
    case DataSource.Tomorrow:
      formElements = (
        <label className="flex flex-col gap-1">
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
          <label className="flex flex-col gap-1">
            Token:{" "}
            <input
              type="text"
              {...register("config.token")}
              placeholder="Token"
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            Username (Email):{" "}
            <input
              type="text"
              {...register("config.username")}
              placeholder="Username (Email)"
              className="w-full"
            />
          </label>
        </>
      );
      break;
    case DataSource.Sportstiming:
      formElements = (
        <label className="flex flex-col gap-1">
          Name:
          <input
            type="text"
            {...register("config.name", {
              required: true,
            })}
            placeholder="Name"
            className="w-full"
          />
        </label>
      );
      break;
    case DataSource.Songkick:
      formElements = (
        <label className="flex flex-col gap-1">
          Artist ID:
          <input
            type="number"
            {...register("config.artistId", {
              required: true,
              valueAsNumber: true,
            })}
            placeholder="Artist ID"
            className="w-full"
          />
        </label>
      );
      break;
    case DataSource.Withings:
      formElements = (
        <label className="flex flex-col gap-1">
          Access Token Response:
          <code>
            {JSON.stringify(source.config.accessTokenResponse, null, 2)}
          </code>
        </label>
      );
      break;
    case DataSource.Spiir:
      formElements = (
        <label className="flex flex-col gap-1">
          Session Key:
          <input
            type="text"
            {...register("config.SessionKey")}
            placeholder="Session Key"
            className="w-full"
          />
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
        update();
      })}
      className="flex w-full max-w-full flex-col items-stretch gap-1"
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
            {source.source}
          </div>
        }
        className="flex w-full max-w-full flex-col items-stretch gap-1 overflow-hidden px-2"
      >
        <label>
          <input
            type="text"
            {...register("name")}
            placeholder="Display Name"
            className="w-full"
          />
        </label>
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
      <h1 className="text-lg font-bold">Data Sources</h1>
      {user?.dataSources && user.dataSources.length > 0 ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-1">
            {[...user.dataSources]
              .sort((a, b) => a.source.localeCompare(b.source))
              .filter((source) => sourceOptions.includes(source.source))
              .filter((source) => !source.paused)
              .map((source) => (
                <UserStuffSourceForm
                  key={source.id}
                  sourceOptions={sourceOptions}
                  source={source}
                />
              ))}
          </div>
          {[...user.dataSources]
            .sort((a, b) => a.source.localeCompare(b.source))
            .filter((source) => sourceOptions.includes(source.source))
            .filter((source) => source.paused).length ? (
            <hr className={"my-2 border-gray-300"} />
          ) : null}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-1">
            {[...user.dataSources]
              .sort((a, b) => a.source.localeCompare(b.source))
              .filter((source) => sourceOptions.includes(source.source))
              .filter((source) => source.paused)
              .map((source) => (
                <UserStuffSourceForm
                  key={source.id}
                  sourceOptions={sourceOptions}
                  source={source}
                />
              ))}
          </div>
        </>
      ) : null}
      <UserStuffSourceCreateForm sourceOptions={sourceOptions} />
    </div>
  );
}

function UserStuffSourceCreateForm({
  sourceOptions,
}: {
  sourceOptions: DataSource[];
}) {
  const instanceId = useId();
  const { data: sessionData } = useSession();
  const user = sessionData?.user;
  const router = useRouter();
  const client = useApolloClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Select
      components={{
        Input: (props) => (
          <components.Input {...props} aria-activedescendant={undefined} />
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
        const initialSourceMeta: Pick<UserDataSourceMeta, "name"> = {
          name: value,
        };

        function append(newSource: Pick<UserDataSource, "source" | "config">) {
          if (!user) return;
          setIsSubmitting(true);
          createUserDataSource(user.id, newSource.source, {
            ...initialSourceMeta,
            ...newSource,
          })
            .then(() => {
              setIsSubmitting(false);
              router.refresh();
              client.refetchQueries({ include: "all" });
            })
            .catch((err: unknown) => {
              setIsSubmitting(false);

              alert(
                String(
                  typeof err === "object" && err !== null && "message" in err
                    ? err.message
                    : err,
                ),
              );
            });
        }

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
                  userid: NaN,
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
          case DataSource.Spiir:
            append({
              ...initialSourceMeta,
              source: DataSource.Spiir,
              config: { SessionKey: "" },
            });
            break;

          default:
            return value satisfies never;
        }
      }}
    />
  );
}
