"use client";
import { useApolloClient } from "@apollo/client/react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Select, { components, OnChangeValue } from "react-select";
import { getDefaultsForSchema } from "zod-defaults";
import {
  createUserDataSource,
  updateUserDataSource,
} from "../app/diary/actions";
import {
  DataSource,
  dataSources,
  UserDataSourceMeta,
  type UserDataSource,
} from "../sources/utils";
import { DistanceToNowStrict } from "./DistanceToNowStrict";
import { FieldSetY } from "./FieldSet";

function UserStuffSourceForm({
  sourceOptions,
  userDataSource,
}: {
  sourceOptions: DataSource[];
  userDataSource: UserDataSource;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: sessionData, update } = useSession();
  const user = sessionData?.user;
  const router = useRouter();
  const client = useApolloClient();

  const defaultValues = useMemo(() => userDataSource, [userDataSource]);
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

  if (!sourceOptions.includes(userDataSource.source)) return null;

  if (!isEditing) {
    const wasFetchedRecently = Boolean(
      userDataSource.lastAttemptedAt &&
      new Date(userDataSource.lastAttemptedAt) >
        new Date(Date.now() - 1000 * 60 * 5),
    );

    if (!sourceOptions.includes(userDataSource.source)) {
      return null;
    }

    return (
      <div
        key={userDataSource.id}
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
                    userDataSource.lastAttemptedAt &&
                    (!userDataSource.lastSuccessfulAt ||
                      new Date(userDataSource.lastAttemptedAt) >
                        new Date(userDataSource.lastSuccessfulAt)) &&
                    (!userDataSource.lastFailedAt ||
                      new Date(userDataSource.lastAttemptedAt) >
                        new Date(userDataSource.lastFailedAt)),
                  ) ||
                  wasFetchedRecently ||
                  userDataSource.paused === true ||
                  userDataSource.source === DataSource.Fitocracy
                }
                className="cursor-pointer text-2xl disabled:cursor-not-allowed disabled:opacity-50"
                onClick={async () => {
                  const promise = fetch(
                    `/api/${userDataSource.source}_scrape?userDataSourceId=${userDataSource.id}`,
                  );
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  router.refresh();
                  await promise;
                  router.refresh();
                  void client.refetchQueries({ include: "all" });
                }}
              >
                🔄
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-between leading-snug">
              {userDataSource.name !== userDataSource.source ? (
                <small>{userDataSource.source}</small>
              ) : null}
              <div className="text-sm font-semibold">{userDataSource.name}</div>
              <div>
                {userDataSource.paused === true ||
                userDataSource.source === DataSource.Fitocracy ? (
                  <>
                    <small>Paused</small>{" "}
                    <span title="This data source is paused and will not be automatically fetched.">
                      ⏸️
                    </span>
                  </>
                ) : userDataSource.lastAttemptedAt &&
                  (!userDataSource.lastSuccessfulAt ||
                    new Date(userDataSource.lastAttemptedAt) >
                      new Date(userDataSource.lastSuccessfulAt)) &&
                  (!userDataSource.lastFailedAt ||
                    new Date(userDataSource.lastAttemptedAt) >
                      new Date(userDataSource.lastFailedAt)) ? (
                  <>
                    <small>
                      <DistanceToNowStrict
                        date={new Date(userDataSource.lastAttemptedAt)}
                      />
                    </small>{" "}
                    <div className="inline-block animate-spin text-lg leading-0">
                      ↻
                    </div>
                  </>
                ) : userDataSource.lastSuccessfulAt &&
                  (!userDataSource.lastFailedAt ||
                    new Date(userDataSource.lastSuccessfulAt) >
                      new Date(userDataSource.lastFailedAt)) ? (
                  <>
                    <small>
                      <DistanceToNowStrict
                        date={new Date(userDataSource.lastSuccessfulAt)}
                      />
                    </small>{" "}
                    ✅
                  </>
                ) : userDataSource.lastFailedAt ? (
                  <>
                    <small>
                      <DistanceToNowStrict
                        date={new Date(userDataSource.lastFailedAt)}
                      />
                    </small>{" "}
                    <span title={userDataSource.lastError || "Unknown error"}>
                      ⚠️
                    </span>
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

  return (
    <form
      onSubmit={handleSubmit(async (newDataSource) => {
        if (!user) return;

        const updatedSource = await updateUserDataSource(
          user.id,
          userDataSource.id,
          newDataSource,
        );

        reset(updatedSource);
        setIsEditing(false);
        router.refresh();
        void client.refetchQueries({ include: "all" });
        void update();
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
            {userDataSource.source}
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
        {dataSources[userDataSource.source].getFormElements({
          register,
          watch,
          setValue,
        })}
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
            {user.dataSources
              .filter(
                (source) =>
                  sourceOptions.includes(source.source) &&
                  source.paused !== true,
              )
              .sort((a, b) => a.source.localeCompare(b.source))
              .map((userDataSource) => (
                <UserStuffSourceForm
                  key={userDataSource.id}
                  sourceOptions={sourceOptions}
                  userDataSource={userDataSource}
                />
              ))}
            <div />
            <div />
            <div />
          </div>
          {[...user.dataSources]
            .sort((a, b) => a.source.localeCompare(b.source))
            .filter((source) => sourceOptions.includes(source.source))
            .filter((source) => source.paused === true).length ? (
            <hr className={"my-2 border-gray-300"} />
          ) : null}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-1">
            {[...user.dataSources]
              .sort((a, b) => a.source.localeCompare(b.source))
              .filter((source) => sourceOptions.includes(source.source))
              .filter((source) => source.paused === true)
              .map((userDataSource) => (
                <UserStuffSourceForm
                  key={userDataSource.id}
                  sourceOptions={sourceOptions}
                  userDataSource={userDataSource}
                />
              ))}
            <div />
            <div />
            <div />
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
  const [value, setValue] = useState<null | {
    label: DataSource;
    value: DataSource;
  }>(null);

  return (
    <Select
      value={value}
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

        const source = selected.value;
        const initialSourceMeta: Pick<UserDataSourceMeta, "name"> = {
          name: source,
        };

        if (!user) return;
        setIsSubmitting(true);
        createUserDataSource(user.id, source, {
          ...initialSourceMeta,
          source,
          config: getDefaultsForSchema(dataSources[source].configSchema),
        })
          .then(() => {
            setValue(null);
            setIsSubmitting(false);
            router.refresh();
            void client.refetchQueries({ include: "all" });
            location.reload();
          })
          .catch((err: unknown) => {
            setValue(null);
            setIsSubmitting(false);
            location.reload();

            alert(
              String(
                typeof err === "object" && err !== null && "message" in err
                  ? err.message
                  : err,
              ),
            );
          });
      }}
    />
  );
}
