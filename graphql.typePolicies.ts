import { TypePolicies } from "@apollo/client";

export const typePolicies: TypePolicies = {
  Todo: {
    fields: {
      created: { read: (d) => d && new Date(d) },
      start: { read: (d) => (d ? new Date(d) : null) },
      due: { read: (d) => (d ? new Date(d) : null) },
      completed: { read: (d) => (d ? new Date(d) : null) },
    },
  },
  Event: {
    fields: {
      created: { read: (d) => d && new Date(d) },
      start: { read: (d) => (d ? new Date(d) : null) },
      end: { read: (d) => (d ? new Date(d) : null) },
      due: { read: (d) => (d ? new Date(d) : null) },
    },
  },
  Workout: {
    fields: {
      workedOutAt: { read: (d) => d && new Date(d) },
      createdAt: { read: (d) => d && new Date(d) },
      updatedAt: { read: (d) => d && new Date(d) },
      materializedAt: { read: (d) => d && new Date(d) },
    },
  },
  WorkoutSet: {
    fields: {
      createdAt: { read: (d) => d && new Date(d) },
      updatedAt: { read: (d) => d && new Date(d) },
    },
  },
};
