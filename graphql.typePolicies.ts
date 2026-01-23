import { TypePolicies } from "@apollo/client";

export const typePolicies: TypePolicies = {
  Todo: {
    fields: {
      start: {
        read(start) {
          return start ? new Date(start) : null;
        },
      },
      due: {
        read(due) {
          return due ? new Date(due) : null;
        },
      },
      completed: {
        read(completed) {
          return completed ? new Date(completed) : null;
        },
      },
    },
  },
};
