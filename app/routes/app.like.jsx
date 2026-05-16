import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const { articleId } = await request.json();

  if (!articleId) {
    return json({ error: "Article ID is required" }, { status: 400 });
  }

  // Get current metafield value
  const query = `
    query GetArticle($id: ID!) {
      article(id: $id) {
        id
        metafield(namespace: "custom", key: "likes_count") {
          id
          value
        }
      }
    }
  `;

  const queryResponse = await admin.graphql(query, {
    variables: { id: articleId },
  });

  const queryData = await queryResponse.json();

  const article = queryData.data.article;
  const currentLikes = parseInt(article?.metafield?.value || "0", 10);
  const newLikes = currentLikes + 1;

  // Update metafield
  const mutation = `
    mutation UpdateArticleLikes($input: ArticleInput!) {
      articleUpdate(input: $input) {
        article {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      id: articleId,
      metafields: [
        {
          namespace: "custom",
          key: "likes_count",
          type: "number_integer",
          value: String(newLikes),
        },
      ],
    },
  };

  const mutationResponse = await admin.graphql(mutation, { variables });
  const mutationData = await mutationResponse.json();

  const errors = mutationData.data.articleUpdate.userErrors;
  if (errors.length > 0) {
    return json({ error: errors[0].message }, { status: 400 });
  }

  return json({
    success: true,
    likes: newLikes,
  });
};