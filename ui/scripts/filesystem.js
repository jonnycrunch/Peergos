
$(document).ready(function(){
    //init. tooltips
    $('[data-toggle="tooltip"]').tooltip();   
});


userContext =  null;

populateModalAndShow = function(title, content) {
        $('#modal-title').html(title);
        $('#modal-body').html(content);
        $('#modal').modal("show");   
}
requireSignedIn = function(callback) {
    if (userContext == null)  
        populateModalAndShow('Who is this?','<p>Please sign in to continue.</p>');
    else
        callback();
}

var url;
var ae = document.createElement("a");
document.body.appendChild(ae);
ae.style = "display: none"; 

function openItem(name, data) {
    if(url != null){
        window.URL.revokeObjectURL(url);
    }
    
    var blob =  new Blob([data], {type: "octet/stream"});		
    url = window.URL.createObjectURL(blob);
    ae.href = url;
    ae.download = name;
    ae.click();
}

var userOptions = React.createClass({
        /**
         *
         *  send friend request
         *
         *  view pending friend requests
         *
         *  accept / deny friend request
         *
         *  share folder/file with friend
         *
         *  show shares
         *
         */
    getInitialState : function() {
    },
    componentDidMount: function() {
    },
    render: function() {
    }
});

var SignUp = React.createClass({
    getInitialState : function() {
            return {
            usernameClass : "",
            usernameMsg : "",
            passwordClass : "",
            passwordMsg :  "" 
            }
    },
    componentDidMount: function() {
        var submit = function() {
            const username = document.getElementById("signup-user-input").value;
            const pw1 = document.getElementById("signup-password-input").value;
            const pw2 = document.getElementById("signup-verify-password-input").value;
            const email = document.getElementById("signup-email-user-input").value;
            //TODO: email
            if (pw1.length < 0) {
                   this.setState({
                        usernameClass : "",
                        usernameMsg : "",
                        passwordClass : "has-error has-feedback",
                        passwordMsg : "Password must be 8 characters long!"
                   }); 
                   return;
            }
            if (pw1 != pw2) {
                   this.setState({
                        usernameClass : "",
                        usernameMsg : "",
                        passwordClass : "has-error has-feedback",
                        passwordMsg : "Entered passwords do not match!"
                   }); 
                   return;

            }

            var ctx = null;
            return generateKeyPairs(username, pw1).then(function(user) {
                    const dht = new DHTClient();
                    const corenode = new CoreNodeClient();
                    ctx = new UserContext(username, user, dht, corenode);    
                    return  ctx.isRegistered();
                }).then(function(registered) {
                        if  (! registered) {
                                console.log("Now registering  user "+ username);
                                return ctx.register();
                        }
                        this.setState({
                                    usernameClass : "has-error has-feedback",
                                    usernameMsg : "Username is already registered!",
                                    passwordClass : "",
                                    passwordMsg : ""
                              });
                        return reject();
                }.bind(this)).then(function(isRegistered) {
                        if  (! isRegistered) { 
                                reject();

                                this.setState({
                                    usernameClass : "has-error has-feedback",
                                    usernameMsg : "Failed to register username",
                                    passwordClass : "",
                                    passwordMsg : ""
                              });
                        }
                        return ctx.createEntryDirectory(username);
                }).then(function(root) {
			            return root.fileAccess.mkdir("shared", ctx, root.filePointer.writer, root.filePointer.mapKey, root.filePointer.baseKey);
		        }.bind(this)).then(function() {
                    console.log("Verified user "+ username +" is registered");
                    populateModalAndShow("Success", "You have registered the username "+  username);
                    this.props.browser.login(username, pw1);
                }.bind(this));
        }.bind(this);
        document.getElementById("signupSubmitButton").onclick = submit; 
    }, 
    render: function() {
                const  usernameClass = "form-group "+ this.state.usernameClass;
                const usernameMsg = this.state.usernameMsg;
                const usernameLabel = usernameMsg == "" ? (<div/>) : (<label>{usernameMsg}</label>)

                const passwordClass = "form-group " + this.state.passwordClass;
                const pwMsg = this.state.passwordMsg;
                const passwordLabel = pwMsg == "" ? (<div/>) : (<label>{pwMsg}</label>)

                return (<div>
                        <div className={usernameClass}>
                            {usernameLabel}
                            <input placeholder="Username" id="signup-user-input" className="form-control" type="text"/>
                        </div>
                        <div className={passwordClass}>
                            {passwordLabel}
                            <input placeholder="Password" id="signup-password-input" className="form-control" type="password"/>
                            <input placeholder="Verify password" id="signup-verify-password-input" className="form-control" type="password"/>
                        </div>
                        <div  className="form-group">
                            <input placeholder="Email address (Optional)" id="signup-email-user-input" className="form-control" type="text"/>
                        </div>

                    <button id="signupSubmitButton" className="btn btn-success">Create account</button>
                    </div>
                   );
    }
});

var File = React.createClass({
        
        glyphClass: function() {
                var className = "glyphicon "; 
                className += this.props.isdir ? "glyphicon-folder-open" : "glyphicon-file";
                return className;
        },

        renderGrid: function() {
                var glyphClass = this.glyphClass();

                return (<div className="col-xs-6 col-md-3">
                                <a id={this.props.id} onClick={this.props.onClick}>
                                <span style={{fontSize:"3.5em"}} className={glyphClass}/>
                                </a>
                                <div className="caption">
                                <h4 className="heading">{this.props.name}</h4>
                                </div>
                                </div>);
        },

        componentDidMount: function() {
                var selector = "#"+this.props.id;
                $(selector).contextmenu({
                        target: '#context-menu',
                        onItem: function(context, evt) {
                                var selected  =  evt.target.text.trim();
                                console.log("on item "+ selected);
                                if  (selected  == "Rename") {
                                       this.rename(); 
                                } else if (selected  == "Remove")  {
				                        this.remove();
                                } else if (selected  == "Open")  {
                                        this.props.onClick();
                                } else if (selected  == "Create public link" && ! this.props.isdir) {
                                        //public link
                                    const publicUrl =  window.location.origin + this.props.retrievedFilePointer.filePointer.toLink();
                                    const content = '<div class="container"><p style="word-wrap;break-all;"><a href="'+ publicUrl+'">public-link</a></p></div>';
                                    console.log("creating public link for "+ this.props.name);
	            			        populateModalAndShow("Public link to file "+  this.props.name, content);
                                } else 
                                        console.log("no  action defined for context menu item "+ selected);    
                        }.bind(this)
                });
        },

        remove: function() {
	    new RetrievedFilePointer(this.writerFilePointer(), this.props.retrievedFilePointer.fileAccess).remove(userContext).then(function(){
		this.props.browser.loadFilesFromServer();
	    }.bind(this));
	},

        rename: function() {
                const newName = prompt("Specify updated name for "+ this.props.name);
                if (newName == null)
                        return;
                //get current props
                const filePointer = this.props.retrievedFilePointer.filePointer;
                const baseKey = filePointer.baseKey;
                const fileAccess = this.props.retrievedFilePointer.fileAccess;

                const key = fileAccess.isDirectory() ? fileAccess.getParentKey(baseKey) : baseKey; 
                const currentProps = fileAccess.getFileProperties(key);

                const newProps = new FileProperties(newName, currentProps.size);

                fileAccess.rename(this.writerFilePointer(), newProps, userContext).then(function() {
                    //now reload the view
                    this.props.browser.loadFilesFromServer();
		}.bind(this));
        },
    
        writerFilePointer: function() {
                var  entryPointFilePointer;
                try  {
                    entryPointFilePointer = this.props.browser.entryPoint().filePointer;
                } catch(err)  {
                    return this.props.retrievedFilePointer.filePointer;
                }

                const current = this.props.retrievedFilePointer.filePointer;

                return new ReadableFilePointer(
                                current.owner,
                                entryPointFilePointer.writer,
                                current.mapKey,
                                current.baseKey);
        },

        renderList: function() {
                //var dateString =  new Date(this.props.time*1000).toGMTString()
                var glyphClass = this.glyphClass();
                var spanStyle = {fontSize:"1.5em"}; 
                
                console.log("rendering list file with props "+ this.props.name);
                return (<tr id={this.props.id}>
                                <td>
                                <a onClick={this.props.onClick}><span style={{fontSize:"1.5em", paddingRight:"10px"}} className={glyphClass}/>{this.props.name}</a>
                                </td>
                                <td>{File.sizeString(this.props.size)}</td>
                                </tr>);
        },

        render: function() {
                console.log("rendering with grid? "+ this.props.gridView);

                return this.props.gridView ? this.renderGrid() : this.renderList();
        }

});


File.id = function() {return (Math.pow(2,31) * Math.random())|0; }

File.timeSort = function(left, right){return left.time - right.time;} 

File.sizeSort = function(left, right){return left.size - right.size;} 

File.pathSort = function(left, right){return left.path.localeCompare(right.path);} 

File.sizes = [{count : 1, unit:"bytes"}, {count : 1024, unit: "kB"}, {count: 1048576 , unit : "MB"}, {count: 1073741824, unit:"GB" } ]

File.sizeString =  function(sizeBytes) {
        var iUnit=0;
        var count=0;
        for (iUnit=0; iUnit < File.sizes.length;iUnit++) {
                count = sizeBytes / File.sizes[iUnit].count;
                if (count < 1024)
                        break;
        }
        return "" + (count|0) +" "+ File.sizes[iUnit].unit;   
}

function updateNavbarPath(path) {
        var elem  = document.getElementById("pathSpan");
        elem.innerHTML = '<span class="glyphicon glyphicon-chevron-right"/>' +path;
}

var Browser = React.createClass({
        getInitialState: function() {
                return {files: [],
                        gridView: true,
                        sort: File.pathSort,
                        retrievedFilePointerPath: []
                };
        },
            
        entryPoint: function() {
            if (this.state.retrievedFilePointerPath.length == 0)
                    throw "No entry-point!";
            return this.state.retrievedFilePointerPath[0];
        },

        entryPointWriterKey: function() {
            return this.entryPoint().filePointer.writer;
        },

        lastRetrievedFilePointer: function() {
            if (this.state.retrievedFilePointerPath.length == 0)
                    throw "No retrived file-pointers!";
            return this.state.retrievedFilePointerPath.slice(-1)[0];
        },

        currentPath : function() {
                return  "/" + userContext.username+"/"+ this.state.retrievedFilePointerPath.map(function(e) {
                    const parentKey = e.fileAccess.getParentKey(e.filePointer.baseKey);
                    const props = e.fileAccess.getFileProperties(parentKey);
                    return props.name;
                }).join("/");
        },

        loadFilesFromServer: function() {
                if (typeof(userContext) == "undefined" || userContext == null)
                        return;
                const callback = function(children) {
                            const files = children.map(function(treenode) {
            	    		const props = treenode.getFileProperties();
	    	            	const isDir = treenode.isDirectory();
			        const name  = props.name;
                		const size = props.size;
                                const onClick = isDir ? function() {
                                    this.addToPath(treenode);
                                }.bind(this) :  function() {
                                    //download the chunks and reconstruct the original bytes
                                    //get the data
                                    $.toaster(
                                    {
                                        priority: "info",
                                        message: "Downloading file "+ name, 
                                        settings: {"timeout":  5000} 
                                    });
                                    treenode.getInputStream(userContext, size).then(function(buf) {
                                        console.log("reading "+ name + " with size "+ size);
			                            return buf.read(size).then(function(originalData) {
                                            openItem(name, originalData);
                                        });
                                    });
                              }.bind(this);

                  			  return {
                                       onClick: onClick,
                                       name: name,
                                       isDir: isDir,
                                       size: size,
                                       filePointer: retrievedFilePointer
			            	    }
                            }.bind(this));

                            this.setState({
                                files: files, 
                                sort: this.state.sort,  
                                gridView: this.state.gridView, 
                                retrievedFilePointerPath: this.state.retrievedFilePointerPath 
                            }, function() {
                                    updateNavbarPath(this.currentPath());
                            }.bind(this)); 
                }.bind(this);

                const isEmpty =  this.state.retrievedFilePointerPath.length == 0;
                if (isEmpty) {
                    userContext.getTreeRoot().then(function(globalRoot) {
			globalRoot.getChildren().then(function(children) {
			    callback(children);
			});
                    }.bind(this));
                }
                else {
		    this.lastRetrievedFilePointer().getChildren(userContext).then(function(children) {
                        callback(children);
                    }.bind(this));
                }    
        },
        onParent: function() {
                    requireSignedIn(function()  {
                    if (this.state.retrievedFilePointerPath.length == 0) {
                            alert("Cannot go back from "+ this.currentPath());
                            return;
                    }
                    this.state.retrievedFilePointerPath = this.state.retrievedFilePointerPath.slice(0,-1);
                    this.loadFilesFromServer();
                }.bind(this));
        },

        onBack : function() {
                requireSignedIn(function()  {
                    //TODO something more appropriate
                    this.onParent();
                }.bind(this));
        },

        onUpload: function() {
                requireSignedIn(function()  {
                $('#uploadInput').click();
                });
        },
        
        onUser: function() {
                requireSignedIn(function()  {
                $('#userOptionsButton').click();
                });

        },

        alternateView: function() {
                var updatedView = !  this.state.gridView;

                this.setState({
                        files: this.state.files, 
                        sort: this.state.sort,  
                        retrievedFilePointerPath: this.state.retrievedFilePointerPath,
                        gridView: updatedView
                });
        },


        uploadFile: function() {
                return function (evt) {
                        if (userContext == null) {
                            alert("Please sign in first!");
                            return false;
                        }
                        var readFile = evt.target.files[0];
                        var name = readFile.name;
                        var filereader = new FileReader();
                        filereader.file_name = readFile.name;
                        const browser = this;
                        filereader.onload = function(){

                            const data = new Uint8Array(this.result);
                            const filename = this.file_name;
                            console.log("upload file-name " + filename +" with data-length "+ data.length);
                                
            
                            const fileKey = SymmetricKey.random();
                            const rootRKey = browser.lastRetrievedFilePointer().filePointer.baseKey;
                            const owner = browser.lastRetrievedFilePointer().filePointer.owner;
                            const dirMapKey = browser.lastRetrievedFilePointer().filePointer.mapKey;
                            const writer = browser.entryPoint().filePointer.writer;
                            const dirAccess =  browser.lastRetrievedFilePointer().fileAccess;
                            const currentPath =  browser.currentPath();
			    const parentLocation = new Location(owner, writer, dirMapKey);
			    const dirParentKey = dirAccess.getParentKey(rootRKey);

                            const file = new FileUploader(filename, data, fileKey, parentLocation, dirParentKey);
                            return file.upload(userContext, owner, writer).then(function(fileLocation) {
                                dirAccess.addFile(fileLocation, rootRKey, fileKey);
                                return userContext.uploadChunk(dirAccess, [], owner, writer, dirMapKey);
                            }).then(function() {
                                
                                $.toaster(
                                {
                                    priority: "success",
                                    message: "File "+ filename  +" uploaded to  "+ currentPath,
                                    settings: {"timeout":  5000} 
                                });
                                browser.loadFilesFromServer();
                            });
                        };
                            $.toaster(
                            {
                                priority: "info",
                                message: "Uploading file  "+ name,
                                settings: {"timeout":  10000} 
                            });
                        filereader.readAsArrayBuffer(readFile);
                }.bind(this);
        },
                                
        loginOnEnter: function(event) {
                if (event.keyCode === 13) {
                        this.login();
                        return false;
                }
        },

        signup: function() {
            $('#modal-title').html("Sign up");
            React.render(
                <SignUp browser={this}/>, 
                document.getElementById('modal-body')
            );
            $('#modal').modal("show");   
        },

        login: function(usernameArg, passwordArg) {
                const usernameInput = document.getElementById("login-user-input");
                const passwordInput = document.getElementById("login-password-input");

                const username = typeof(usernameArg) == "string" ? usernameArg : usernameInput.value;
                const password = typeof(passwordArg) == "string" ? passwordArg : passwordInput.value;

                const onVerified  = function() {
                        const displayName = userContext.username;
                        usernameInput.value = "";
                        passwordInput.value="";
                        $("#logout").html("<button id=\"logoutButton\" class=\"btn btn-default\">"+
"<span class=\"glyphicon glyphicon-off\"/>  " +
                                        displayName+
                                        "</button>");
                        $("#logoutButton").click(this.logout);
                        $("#login-form").css("display","none");
                        this.loadFilesFromServer();
                    }.bind(this);

                var ctx = null;
                return generateKeyPairs(username, password).then(function(user) {
                        var dht = new DHTClient();
                        var corenode = new CoreNodeClient();
                        ctx = new UserContext(username, user, dht, corenode);    
                        return  ctx.isRegistered();
                }).then(function(registered) {
                        if  (! registered) {
                                console.log("User is "+ username + " is not  verified");
                                populateModalAndShow("Authentication Failure", "Invalid credentials.");
                                return reject();
                        }
                        else   
                            userContext = ctx;  
                }).then(onVerified, 
                        function() {
                                //failed to authenticate user
                                passwordInput.value='';
                                populateModalAndShow("Authentication Failure", "Invalid credentials.");
                });
        },

        logout: function(evt) {
            console.log("User logging out.");
            requireSignedIn(function() {
                userContext = null;
                this.setState(this.getInitialState(),
                function() {
                        $("#login-form").css("display","block");
                        $("#logout").html("");
                });
            }.bind(this));
        },

        componentDidMount: function() {
                this.loadFilesFromServer();
                var backButton = document.getElementById("backButton");
                backButton.onclick = this.onBack;
                var uploadButton = document.getElementById("uploadButton");
                uploadButton.onclick = this.onUpload;
                var userOptionsButton = document.getElementById("userOptionsButton");
                userOptionsButton.onclick = this.onUser;
                var parentButton = document.getElementById("parentButton");
                parentButton.onclick = this.onParent;
                var uploadInput = document.getElementById("uploadInput"); 
                uploadInput.addEventListener("change", this.uploadFile(), false);
                var mkdirButton = document.getElementById("mkdirButton"); 
                mkdirButton.onclick = this.mkdir;
                var alternateViewButton = document.getElementById("alternateViewButton"); 
                alternateViewButton.onclick = this.alternateView; 
                var loginButton = document.getElementById("loginButton");
                loginButton.onclick = this.login; 
                var signupButton = document.getElementById("signupButton");
                signupButton.onclick = this.signup; 
                var passwordInput= document.getElementById("login-password-input");
                passwordInput.onkeypress=this.loginOnEnter;
        },

        updateSort: function(sort) {
                var files  = this.state.files
                        var lastSort = this.state.sort;
                if  (lastSort == sort)  
                        files = files.reverse();
                else 
                        files = files.sort(sort);

                this.setState({files: files, sort: sort,  paths: this.state.paths, gridView: this.state.gridView});
        },

        timeSort: function() {
                this.updateSort(File.timeSort);
        },
        pathSort: function() {
                this.updateSort(File.pathSort);
        },
        sizeSort: function() {
                this.updateSort(File.sizeSort);
        },
        updatePath: function(path) {
                this.loadFilesFromServer(path);
        },

        addToPath: function(retrievedFilePointer) {
                const path= this.state.retrievedFilePointerPath.slice();//copy
                path.push(retrievedFilePointer);
                this.setState({
                        files: this.state.files, 
                        sort: this.state.sort,  
                        gridView: this.state.gridView, 
                        retrievedFilePointerPath: path
                },
                this.loadFilesFromServer
                );
        },

        updateDir: function(entryPoint, dirAccess) {
                this.loadFilesFromServer(path);
        },

        getContent: function(path) {
                var url = buildGetContentUrl(path);
                location.href=url;
        },

        mkdir: function() {
                requireSignedIn(function()  {
                    const newFolderName = prompt("Enter new folder name");
                    if (newFolderName == null)
                        return;
                
                    const isEmpty =  this.state.retrievedFilePointerPath.length == 0;
                    if (isEmpty) {
                        //create new root-dir
                        console.log("creating new entry-point "+ newFolderName);
                        return userContext.createEntryDirectory(newFolderName)
                            .then(this.loadFilesFromServer);
                    }
                    else {
                        console.log("creating new sub-dir "+ newFolderName);
                        const lastRetrievedFilePointer =  this.lastRetrievedFilePointer();
		                const dirPointer = lastRetrievedFilePointer.filePointer;
		                const dirAccess = lastRetrievedFilePointer.fileAccess;
    		            var rootDirKey = dirPointer.baseKey;
	    			    return dirAccess.mkdir(newFolderName, userContext, this.entryPointWriterKey(), dirPointer.mapKey, rootDirKey)
                            .then(this.loadFilesFromServer);
                    }
                }.bind(this));
        },

        render: function() {
                const files = this.state.files.map(function(f) {
                            return (<File id={File.id()} gridView={this.state.gridView} onClick={f.onClick} name={f.name} isdir={f.isDir} size={f.size} browser={this} retrievedFilePointer={f.filePointer}/>)
                }.bind(this)); 

                const gridGlyph = "glyphicon glyphicon-th-large";
                const listGlyph = "glyphicon glyphicon-list";
                const element = document.getElementById("altViewSpan");
                const className = this.state.gridView ? listGlyph : gridGlyph;
                element.className = className;
                var layout = null;
                var  contextMenu = (<div id="context-menu">
                                <ul className="dropdown-menu" role="menu">
                                <li><a tabIndex="-1">Open</a></li>
                                <li className="divider"></li>
                                <li><a tabIndex="-1">Rename</a></li>
                                <li className="divider"></li>
                                <li><a tabIndex="-1">Remove</a></li>
                                <li className="divider"></li>
                                <li><a tabIndex="-1">Create public link</a></li>
                                </ul>
                                </div>);

                layout = null; 
                if (this.state.gridView) 
                        return (<div>
                                        {files}
                                        {contextMenu}
                                        </div>)

                                const sortGlyph = "glyphicon glyphicon-sort";

                return (<div>
                                <table className="table table-responsive table-striped table-hover">
                                <thead><tr>
                                <th><button onClick={this.pathSort} className="btn btn-default"><span className={sortGlyph}/>Path</button></th>
                                <th><button onClick={this.sizeSort} className="btn btn-default"><span className={sortGlyph}/>Size</button></th>
                                </tr></thead>
                                <tbody>
                                {files}
                                </tbody>
                                </table>
                                {contextMenu}
                                </div>)
        }
});


React.render(
                <Browser/>,
                document.getElementById('content')
            );
