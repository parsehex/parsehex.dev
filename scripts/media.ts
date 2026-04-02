// script meant to sync local media folder with r2

// pull - bring in media from r2, basically cloning the bucket
// push - upload all local media to r2
// without a command, run in interactive mode to resolve conflicts


// get all the remote files, all local files. keep track of processed files
// "use" = keep / upload
// for any file:
//   local === remote (name, size, anything else we can/should check)
//     -> skip
// for each local file:
//   no remote file with name -> upload or delete (if pulling)
//   diff remote file, same name -> prompt which to use
// for each remote file:
//   no local file with name -> prompt to delete (auto if pushing)
//   diff local file, same name -> prompt which to use

// i'm thinking that push/pull should auto-set the conflict behavior, skipping prompts
//   let's prompt at the start that it's automatic and possibly destructive

// IDEA: use json file adjacent to media to populate DB with metadata?
