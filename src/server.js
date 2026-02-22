const express = require("express");
require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express5");

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const app = express();
app.use(express.json());

const typeDefs = `
  type User {
    _id: ID!
    username: String!
    email: String!
    created_at: String
    updated_at: String
  }

  type SignupResponse {
    success: Boolean!
    message: String!
    user: User
  }

  type Query {
    hello: String
  }

  type Mutation {
    signup(username: String!, email: String!, password: String!): SignupResponse!
  }
`;

const resolvers = {
  Query: {
    hello: () => "GraphQL is working!",
  },
  Mutation: {
    signup: async (_, { username, email, password }) => {
      if (!username || !email || !password) {
        return { success: false, message: "All fields are required", user: null };
      }

      const existing = await User.findOne({
        $or: [{ username }, { email }],
      });

      if (existing) {
        return { success: false, message: "Username or email already exists", user: null };
      }

      const hashed = await bcrypt.hash(password, 10);

      const user = await User.create({
        username,
        email,
        password: hashed,
      });

      return { success: true, message: "User created successfully", user };
    },
  },
};

async function startServer() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  await mongoose.connect(process.env.MONGO_URI);

  console.log("MongoDB connected");

  app.use("/graphql", expressMiddleware(server));

  app.get("/", (req, res) => res.json({ status: "ok" }));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();