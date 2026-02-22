const express = require("express");
require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express5");

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Employee = require("./models/Employee");

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

  type Employee {
    _id: ID!
    first_name: String!
    last_name: String!
    email: String
    gender: String
    designation: String!
    salary: Float!
    date_of_joining: String!
    department: String!
    employee_photo: String
    created_at: String
    updated_at: String
  }

  type EmployeeResponse {
    success: Boolean!
    message: String!
    employee: Employee
  }

  type SignupResponse {
    success: Boolean!
    message: String!
    user: User
  }

  type Query {
    login(username: String, email: String, password: String!): SignupResponse!
    getAllEmployees: [Employee]!
    getEmployeeById(eid: ID!): Employee
    searchEmployees(designation: String, department: String): [Employee]!
  }

  type Mutation {
    signup(
      username: String!, 
      email: String!, 
      password: String!
    ): SignupResponse!

    addNewEmployee(
      first_name: String!
      last_name: String!
      email: String
      gender: String
      designation: String!
      salary: Float!
      date_of_joining: String!
      department: String!
      employee_photo: String
    ): EmployeeResponse!

    updateEmployeeById(
      eid: ID!
      first_name: String
      last_name: String
      email: String
      gender: String
      designation: String
      salary: Float
      date_of_joining: String
      department: String
      employee_photo: String
    ): EmployeeResponse!

    deleteEmployeeById(
      eid: ID!
    ): EmployeeResponse!
  }
`;

const resolvers = {
  Query: {
    login: async (_, { username, email, password }) => {
      if ((!username && !email) || !password) {
        return { success: false, message: "Username/email and password required", user: null };
      }

      const user = await User.findOne({
        $or: [{ username }, { email }],
      });

      if (!user) {
        return { success: false, message: "User not found", user: null };
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return { success: false, message: "Invalid password", user: null };
      }

      return { success: true, message: "Login successful", user };
    },
    getAllEmployees: async () => {
      return await Employee.find();
    },
    getEmployeeById: async (_, { eid }) => {
      if (!mongoose.Types.ObjectId.isValid(eid)) return null;
      return await Employee.findById(eid);
    },
    searchEmployees: async (_, { designation, department }) => {
      if (!designation && !department) return [];

      const filter = {};
      if (designation) filter.designation = designation;
      if (department) filter.department = department;

      return await Employee.find(filter);
    },
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

    addNewEmployee: async (_, args) => {
      if (args.salary < 1000) {
        return {
          success: false,
          message: "Salary must be at least 1000",
          employee: null
        };
      }

      const employee = await Employee.create(args);

      return {
        success: true,
        message: "Employee added successfully",
        employee
      };
    },

    updateEmployeeById: async (_, { eid, ...updates }) => {
      if (updates.salary && updates.salary < 1000) {
        return {
          success: false,
          message: "Salary must be at least 1000",
          employee: null
        };
      }

      if (!mongoose.Types.ObjectId.isValid(eid)) {
        return {
          success: false,
          message: "Invalid employee id",
          employee: null
        };
      }

      const employee = await Employee.findByIdAndUpdate(
        eid,
        updates,
        { new: true }
      );

      if (!employee) {
        return {
          success: false,
          message: "Employee not found",
          employee: null
        };
      }

      return {
        success: true,
        message: "Employee updated successfully",
        employee
      };
    },

    deleteEmployeeById: async (_, { eid }) => {
      if (!mongoose.Types.ObjectId.isValid(eid)) {
        return {
          success: false,
          message: "Invalid employee id",
          employee: null
        };
      }

      const employee = await Employee.findByIdAndDelete(eid);

      if (!employee) {
        return {
          success: false,
          message: "Employee not found",
          employee: null
        };
      }

      return {
        success: true,
        message: "Employee deleted successfully",
        employee
      };
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