/*
  Warnings:

  - Made the column `grade` on table `enrollments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rating` on table `enrollments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `region` on table `students` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "enrollments" ALTER COLUMN "grade" SET NOT NULL,
ALTER COLUMN "rating" SET NOT NULL;

-- AlterTable
ALTER TABLE "students" ALTER COLUMN "region" SET NOT NULL;
