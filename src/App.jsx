import "./App.css";
import { useEffect, useState } from "react";
import useOnlineStatus from './CustomHook/useOnlineStatus'; // Adjust the path accordingly

const idb =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

const App = () => {
  const onlineStatus = useOnlineStatus();
  const [addUser, setAddUser] = useState(false);
  const [userDetails, setUserDetails] = useState({
    id: null,
    firstName: "",
    lastName: "",
    email: "",
    age: "",
    editing: false,
  });
  const [allUsers, setAllUsers] = useState([]);
  console.log("allUsers",allUsers);

  useEffect(() => {
    insertDataInIndexedDb();
    getAllData();
    if (onlineStatus) {
      syncWithBackend();
    }
  }, []);

  const syncWithBackend = () => {
    allUsers.forEach(user => {
      if (user.deleted && onlineStatus) {
        deleteUserFromBackend(user);
      } else if (user.added && onlineStatus) {
        addUserToBackend(user);
      } else if (user.updated && onlineStatus) {
        updateUserOnBackend(user);
      }
    });
  };

  const insertDataInIndexedDb = () => {
    if (!idb) {
      console.log("This browser doesn't support IndexedDB");
      return;
    }
  
    const request = idb.open("test-db", 1);
  
    request.onerror = function (event) {
      console.error("An error occurred with IndexedDB");
      console.error(event);
    };
  
    request.onupgradeneeded = function (event) {
      const db = request.result;
  
      if (!db.objectStoreNames.contains("userData")) {
        const objectStore = db.createObjectStore("userData", { keyPath: "id" });
  
        objectStore.createIndex("age", "age", {
          unique: false,
        });
      }
    };
  
    request.onsuccess = function () {
      console.log("Database opened successfully");
  
      const db = request.result;
  
      var tx = db.transaction("userData", "readwrite");
      var userData = tx.objectStore("userData");
  
      // USER_DATA.forEach((item) => userData.add(item)); // Remove this line as USER_DATA is not defined
  
      return tx.complete;
    };
  };

  const getAllData = () => {
    const dbPromise = idb.open("test-db", 1);
    dbPromise.onsuccess = () => {
      const db = dbPromise.result;

      var tx = db.transaction("userData", "readonly");
      var userData = tx.objectStore("userData");
      const users = userData.getAll();

      users.onsuccess = (query) => {
        setAllUsers(query.target.result);
      };

      tx.oncomplete = function () {
        db.close();
      };
    };
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onlineStatus) {
      performDataOperationOnBackend();
    } else {
      storeDataInIndexedDb();
    }
  };

  const storeDataInIndexedDb = () => {
    const updatedUsers = [...allUsers];
    if (userDetails.editing) {
      const index = updatedUsers.findIndex(user => user.id === userDetails.id);
      updatedUsers[index] = userDetails;
    } else {
      const id = Math.floor(Math.random() * 1000000);
      const newUser = { ...userDetails, id };
      updatedUsers.push(newUser);
    }
    setAllUsers(updatedUsers);
  
    const request = idb.open("test-db", 1);
  
    request.onerror = function (event) {
      console.error("An error occurred with IndexedDB");
      console.error(event);
    };
  
    request.onsuccess = function () {
      console.log("Database opened successfully");
  
      const db = request.result;
  
      var tx = db.transaction("userData", "readwrite");
      var userData = tx.objectStore("userData");
  
      userData.clear();
  
      updatedUsers.forEach((item) => userData.add(item));
  
      return tx.complete;
    };
  };
  
  const performDataOperationOnBackend = () => {
    if (userDetails.editing) {
      updateUserOnBackend(userDetails);
    } else {
      addUserToBackend(userDetails);
    }
  };

  const addUserToBackend = (user) => {
    fetch("http://16.171.47.172:5000/api/admin/recruiter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(user)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to add user");
      }
      return response.json();
    })
    .then(data => {
      setUserDetails({
        id: null,
        firstName: "",
        lastName: "",
        email: "",
        age: "",
        editing: false
      });
      getAllData();
    })
    .catch(error => {
      console.error("Error adding user:", error);
    });
  };

  const updateUserOnBackend = (user) => {
    fetch(`http://16.171.47.172:5000/api/admin/recruiter/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(user)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to update user");
      }
      return response.json();
    })
    .then(data => {
      setUserDetails({
        id: null,
        firstName: "",
        lastName: "",
        email: "",
        age: "",
        editing: false
      });
      getAllData();
    })
    .catch(error => {
      console.error("Error updating user:", error);
    });
  };

  const deleteUserFromBackend = (user) => {
    fetch(`http://16.171.47.172:5000/api/admin/recruiter/${user.id}`, {
      method: "DELETE"
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
      return response.json();
    })
    .then(data => {
      getAllData();
    })
    .catch(error => {
      console.error("Error deleting user:", error);
    });
  };

  const deleteSelected = (user) => {
    if (onlineStatus) {
      deleteUserFromBackend(user);
    } else {
      storeDeleteOperationInIndexedDb(user);
    }
  };

  const storeDeleteOperationInIndexedDb = (user) => {
    const updatedUsers = allUsers.map(u => {
      if (u.id === user.id) {
        return { ...u, deleted: true };
      }
      return u;
    });
    setAllUsers(updatedUsers);
  };

  return (
    <div className="row" style={{ padding: 100 }}>
    <div className="col-md-6">
      <div>
        <button
          className="btn btn-primary float-end mb-2"
          onClick={() => {
            setUserDetails({
              id: null,
              firstName: "",
              lastName: "",
              email: "",
              age: "",
              editing: false
            });
            setAddUser(true);
          }}
        >
          Add
        </button>
      </div>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Age</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {allUsers?.map((user) => {
            return (
              <tr key={user?.id}>
                <td>{user?.firstName}</td>
                <td>{user?.lastName}</td>
                <td>{user?.age}</td>
                <td>{user?.email}</td>
                <td>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      setUserDetails({
                        ...user,
                        editing: true
                      });
                    }}
                  >
                    Edit
                  </button>{" "}
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteSelected(user)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className="col-md-6">
      {addUser || userDetails.editing ? (
        <div className="card" style={{ padding: "20px" }}>
          <h3>{userDetails.editing ? "Update User" : "Add User"}</h3>
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              className="form-control"
              onChange={(e) => setUserDetails({...userDetails, firstName: e.target.value})}
              value={userDetails.firstName}
            />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              className="form-control"
              onChange={(e) => setUserDetails({...userDetails, lastName: e.target.value})}
              value={userDetails.lastName}
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              name="age"
              className="form-control"
              onChange={(e) => setUserDetails({...userDetails, age: e.target.value})}
              value={userDetails.age}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              className="form-control"
              onChange={(e) => setUserDetails({...userDetails, email: e.target.value})}
              value={userDetails.email}
            />
          </div>
          <div className="form-group">
            <button
              className="btn btn-primary mt-2"
              type="submit"
              onClick={handleSubmit}
            >
              {userDetails.editing ? "Update" : "Add"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  </div>
);
};

export default App;
