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
};
