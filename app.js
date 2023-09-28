const express = require("express");
const app = express();
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
app.use(express.json());
let database = null;
const databasePath = path.join(__dirname, "covid19India.db");

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server running successfully at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Database error ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDatabaseObjectToResponseObject = (dbResponse) => {
  return {
    stateId: dbResponse[0].state_id,
    stateName: dbResponse[0].state_name,
    population: dbResponse[0].population,
  };
};

const convertDatabaseDistrictObjectToRResponseObject = (databaseObject) => {
  return {
    districtId: databaseObject.district_id,
    districtName: databaseObject.district_name,
    stateId: databaseObject.state_id,
    cases: databaseObject.cases,
    cured: databaseObject.cured,
    active: databaseObject.active,
    deaths: databaseObject.deaths,
  };
};

const extractReqDetails = (dbResponse) => {
  return {
    totalCases: dbResponse.total_cases,
    totalCured: dbResponse.total_cured,
    totalActive: dbResponse.total_active,
    totalDeaths: dbResponse.total_deaths,
  };
};

const convertDatabaseObjToResponseObject = (databaseObject) => {
  const modifiedDetails = databaseObject.map((eachItem) => {
    return {
      stateId: eachItem.state_id,
      stateName: eachItem.state_name,
      population: eachItem.population,
    };
  });
  return modifiedDetails;
};

// API-1 Get all states
app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
    SELECT 
      * 
    FROM
      state;`;

  const allStates = await database.all(getAllStatesQuery);
  response.send(convertDatabaseObjToResponseObject(allStates));
});

// API-2 State details based on stateId
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getDetailsQuery = `
    SELECT
      *
    FROM 
      state
    WHERE state_id = ${stateId};`;

  const dbResponse = await database.all(getDetailsQuery);
  response.send(convertDatabaseObjectToResponseObject(dbResponse));
});

// API-3 Create a new district
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const createQuery = `
     INSERT INTO 
        district(district_name, state_id, cases, cured, active, deaths)
     VALUES(
        '${districtName}',
        ${stateId}, 
        ${cases}, 
        ${cured}, 
        ${active},
        ${deaths});`;

  await database.run(createQuery);
  response.send("District Successfully Added");
});

// API-4 get district details based on district ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const getDetails = `
      SELECT 
        * 
      FROM 
        district
      WHERE district_id = ${districtId};`;
  const dbResponse = await database.get(getDetails);
  response.send(convertDatabaseDistrictObjectToRResponseObject(dbResponse));
});

// API-5 delete district
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const deleteQuery = `
      DELETE FROM
        district
      WHERE district_id = ${districtId};`;
  await database.run(deleteQuery);
  response.send("District Removed");
});

// API-6 update district details
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const updateQuery = `
    UPDATE 
      district
    SET 
      district_name = '${districtName}',
      state_id = ${stateId},
      cases = ${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
    WHERE
      district_id = ${districtId};`;

  await database.run(updateQuery);
  response.send("District Details Updated");
});

// API-7 get cases details
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;

  const getDetailsQuery = `
    SELECT 
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE 
      state_id = ${stateId};`;
  const stats = await database.get(getDetailsQuery);
  console.log(stats);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

// API-8 get state name based on district ID
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateIdQuery = `
    SELECT
      state_id
    FROM
      district
    WHERE
      district_id = ${districtId};`;

  const getStateIdQueryResponse = await database.get(getStateIdQuery);
  const stateId = getStateIdQueryResponse.state_id;

  const getStateNameQuery = `
    SELECT
      state_name
    FROM
      state
    WHERE 
      state_id = ${stateId};`;

  const getStateNameQueryResponse = await database.get(getStateNameQuery);
  response.send({
    stateName: getStateNameQueryResponse.state_name,
  });
});

module.exports = app;
